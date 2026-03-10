param(
  [string]$Username = "twin_soulstudio",
  [int]$MaxPosts = 24,
  [string]$IndexPath = "index.html",
  [int]$MaxAttempts = 5,
  [string]$Cookie = ""
)

$ErrorActionPreference = "Stop"

function Escape-Html {
  param([string]$Text)
  if ($null -eq $Text) { return "" }
  return $Text.Replace("&", "&amp;").Replace("<", "&lt;").Replace(">", "&gt;").Replace('"', "&quot;")
}

function Get-BackoffSeconds {
  param([int]$Attempt)
  switch ($Attempt) {
    1 { return 45 }
    2 { return 120 }
    3 { return 300 }
    4 { return 600 }
    default { return 900 }
  }
}

function Invoke-InstagramRequest {
  param(
    [string]$Uri,
    [hashtable]$Headers,
    [int]$TimeoutSec,
    [int]$Attempts,
    [switch]$ReturnRaw
  )

  for ($attempt = 1; $attempt -le $Attempts; $attempt++) {
    try {
      if ($ReturnRaw) {
        return Invoke-WebRequest -Uri $Uri -Headers $Headers -TimeoutSec $TimeoutSec
      }
      return Invoke-RestMethod -Uri $Uri -Headers $Headers -TimeoutSec $TimeoutSec
    } catch {
      $statusCode = $null
      if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
        $statusCode = [int]$_.Exception.Response.StatusCode
      }

      if ($attempt -eq $Attempts) {
        throw
      }

      $delay = Get-BackoffSeconds -Attempt $attempt
      if ($statusCode -eq 429) {
        Write-Warning "Instagram rate-limited attempt $attempt/$Attempts for $Uri. Waiting $delay seconds before retry."
      } else {
        Write-Warning "Instagram request failed on attempt $attempt/$Attempts for $Uri. Waiting $delay seconds before retry."
      }
      Start-Sleep -Seconds $delay
    }
  }
}

function Convert-EdgesToPayload {
  param([object]$Edges)

  if (-not $Edges) {
    return $null
  }

  $list = @($Edges)
  if ($list.Count -eq 0) {
    return $null
  }

  return @{ data = @{ user = @{ edge_owner_to_timeline_media = @{ edges = $list } } } }
}

function Get-InstagramPayload {
  param(
    [string]$Username,
    [hashtable]$Headers,
    [int]$Attempts
  )

  $sources = @(
    @{ Uri = "https://i.instagram.com/api/v1/users/web_profile_info/?username=$Username"; Type = "api-v1" },
    @{ Uri = "https://www.instagram.com/$Username/?__a=1&__d=dis"; Type = "graphql" },
    @{ Uri = "https://www.instagram.com/$Username/"; Type = "html" }
  )

  foreach ($source in $sources) {
    try {
      if ($source.Type -eq "html") {
        $response = Invoke-InstagramRequest -Uri $source.Uri -Headers $Headers -TimeoutSec 30 -Attempts $Attempts -ReturnRaw
        $html = $response.Content
        $match = [regex]::Match($html, '"edge_owner_to_timeline_media":\{"count":\d+,"page_info":\{.*?\},"edges":(?<edges>\[.*?\])\}', [System.Text.RegularExpressions.RegexOptions]::Singleline)
        if (-not $match.Success) {
          continue
        }

        $edgesJson = $match.Groups['edges'].Value
        $edges = $edgesJson | ConvertFrom-Json
        $payload = Convert-EdgesToPayload -Edges $edges
        if ($payload) {
          Write-Output "Using Instagram HTML fallback source"
          return $payload
        }
        continue
      }

      $json = Invoke-InstagramRequest -Uri $source.Uri -Headers $Headers -TimeoutSec 30 -Attempts $Attempts
      if ($source.Type -eq "graphql") {
        if ($json.graphql.user.edge_owner_to_timeline_media.edges) {
          Write-Output "Using Instagram GraphQL fallback source"
          return @{ data = @{ user = @{ edge_owner_to_timeline_media = @{ edges = $json.graphql.user.edge_owner_to_timeline_media.edges } } } }
        }
        continue
      }

      if ($json.data.user.edge_owner_to_timeline_media.edges) {
        Write-Output "Using Instagram web profile source"
        return $json
      }
    } catch {
      $statusCode = $null
      if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
        $statusCode = [int]$_.Exception.Response.StatusCode
      }

      if ($statusCode -eq 429) {
        Write-Warning "Instagram source $($source.Type) hit rate limits. Trying next source."
        continue
      }

      Write-Warning "Instagram source $($source.Type) failed. Trying next source."
      continue
    }
  }

  throw "Unable to fetch Instagram data from any configured source for @$Username"
}

function Download-InstagramImage {
  param(
    [string]$Uri,
    [string]$OutFile,
    [hashtable]$Headers,
    [int]$Attempts
  )

  for ($attempt = 1; $attempt -le $Attempts; $attempt++) {
    try {
      Invoke-WebRequest -Uri $Uri -Headers $Headers -OutFile $OutFile -TimeoutSec 30
      return
    } catch {
      $statusCode = $null
      if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
        $statusCode = [int]$_.Exception.Response.StatusCode
      }

      if ($attempt -eq $Attempts) {
        throw
      }

      $delay = Get-BackoffSeconds -Attempt $attempt
      if ($statusCode -eq 429) {
        Write-Warning "Image download rate-limited on attempt $attempt/$Attempts. Waiting $delay seconds before retry."
      } else {
        Write-Warning "Image download failed on attempt $attempt/$Attempts. Waiting $delay seconds before retry."
      }
      Start-Sleep -Seconds $delay
    }
  }
}

$headers = @{
  "x-ig-app-id" = "936619743392459"
  "User-Agent"  = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
  "Accept"      = "*/*"
  "Referer"     = "https://www.instagram.com/$Username/"
}

if (-not [string]::IsNullOrWhiteSpace($Cookie)) {
  $headers["Cookie"] = $Cookie
}

try {
  $json = Get-InstagramPayload -Username $Username -Headers $headers -Attempts $MaxAttempts
} catch {
  $message = $_.Exception.Message
  if ($message -like '*rate limit*' -or $message -like '*Unable to fetch Instagram data*') {
    Write-Warning "Instagram sync skipped. Existing gallery remains unchanged."
    exit 0
  }
  throw
}

$posts = $json.data.user.edge_owner_to_timeline_media.edges
if (-not $posts) {
  throw "No posts returned for @$Username"
}

$posts = $posts | Select-Object -First $MaxPosts

$assetDir = Join-Path "assets" "insta"
if (!(Test-Path $assetDir)) {
  New-Item -ItemType Directory -Path $assetDir -Force | Out-Null
}

$tempAssetDir = Join-Path $assetDir "_sync_tmp"
if (Test-Path $tempAssetDir) {
  Remove-Item -Path $tempAssetDir -Recurse -Force
}
New-Item -ItemType Directory -Path $tempAssetDir -Force | Out-Null

$cards = New-Object System.Collections.Generic.List[string]
$i = 1
foreach ($edge in $posts) {
  $node = $edge.node
  if (-not $node) {
    $node = $edge
  }

  $displayUrl = $node.display_url
  if ([string]::IsNullOrWhiteSpace($displayUrl) -and $node.thumbnail_src) {
    $displayUrl = $node.thumbnail_src
  }
  if ([string]::IsNullOrWhiteSpace($displayUrl)) {
    continue
  }

  $imgRel = "assets/insta/highlight-$i.jpg"
  $imgTempPath = Join-Path $tempAssetDir "highlight-$i.jpg"

  Download-InstagramImage -Uri $displayUrl -OutFile $imgTempPath -Headers $headers -Attempts $MaxAttempts

  $isVideo = [bool]$node.is_video
  $shortcode = $node.shortcode
  $postUrl = if ($isVideo) {
    "https://www.instagram.com/reel/$shortcode/"
  } else {
    "https://www.instagram.com/p/$shortcode/"
  }

  $caption = ""
  if ($node.edge_media_to_caption -and $node.edge_media_to_caption.edges.Count -gt 0) {
    $caption = $node.edge_media_to_caption.edges[0].node.text
  } elseif ($node.accessibility_caption) {
    $caption = $node.accessibility_caption
  }

  $caption = ($caption -replace "`r|`n", " ").Trim()
  if ([string]::IsNullOrWhiteSpace($caption)) {
    $caption = "Handmade resin artwork by Twin Soul Studio."
  }

  $title = "Instagram Post #$i"
  $mediaType = if ($isVideo) { "Reel" } else { "Photo" }
  $commentCount = 0
  if ($node.edge_media_to_comment) {
    $commentCount = [int]$node.edge_media_to_comment.count
  }
  $likeCount = 0
  if ($node.edge_liked_by) {
    $likeCount = [int]$node.edge_liked_by.count
  } elseif ($node.edge_media_preview_like) {
    $likeCount = [int]$node.edge_media_preview_like.count
  }
  $desc = $caption
  if ($desc.Length -gt 110) {
    $desc = $desc.Substring(0, 110).Trim() + "..."
  }

  $cards.Add(@"
          <article class="art-card" data-media="$($mediaType.ToLower())">
            <img class="art-media" src="$imgRel" alt="Twin Soul Studio Instagram post $i" loading="lazy" />
            <div class="card-tags">
              <span class="badge badge-type">$mediaType</span>
              <span class="badge badge-source">Instagram</span>
            </div>
            <h3>$(Escape-Html $title)</h3>
            <p>$(Escape-Html $desc)</p>
            <div class="card-metrics">
              <span><strong>$likeCount</strong> likes</span>
              <span><strong>$commentCount</strong> comments</span>
            </div>
            <p class="comment-inline">Recent comments from Instagram: <strong>$commentCount</strong></p>
            <a class="meta-link" href="$postUrl" target="_blank" rel="noopener noreferrer">View on Instagram</a>
          </article>
"@.TrimEnd())

  $i++
}

if ($cards.Count -eq 0) {
  Write-Warning "Instagram sync skipped because no valid posts were extracted. Existing gallery remains unchanged."
  exit 0
}

Get-ChildItem -Path $assetDir -Filter "highlight-*.jpg" -ErrorAction SilentlyContinue | Remove-Item -Force
Get-ChildItem -Path $tempAssetDir -Filter "highlight-*.jpg" | ForEach-Object {
  Move-Item -Path $_.FullName -Destination (Join-Path $assetDir $_.Name) -Force
}
Remove-Item -Path $tempAssetDir -Recurse -Force

$index = Get-Content -Raw -Path $IndexPath
$startMarker = "<!-- AUTO_GALLERY_START -->"
$endMarker = "<!-- AUTO_GALLERY_END -->"

$startIdx = $index.IndexOf($startMarker)
$endIdx = $index.IndexOf($endMarker)
if ($startIdx -lt 0 -or $endIdx -lt 0 -or $endIdx -le $startIdx) {
  throw "Could not find gallery markers in $IndexPath"
}

$startInsert = $startIdx + $startMarker.Length
$before = $index.Substring(0, $startInsert)
$after = $index.Substring($endIdx)
$newContent = "`r`n" + ($cards -join "`r`n") + "`r`n          "

Set-Content -Path $IndexPath -Value ($before + $newContent + $after) -Encoding utf8
Write-Output "Updated $($cards.Count) posts for @$Username"