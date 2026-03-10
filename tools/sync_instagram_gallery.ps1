param(
  [string]$Username = "twin_soulstudio",
  [int]$MaxPosts = 24,
  [string]$IndexPath = "index.html",
  [int]$MaxAttempts = 5
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
    [int]$Attempts
  )

  for ($attempt = 1; $attempt -le $Attempts; $attempt++) {
    try {
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
        Write-Warning "Instagram rate-limited attempt $attempt/$Attempts. Waiting $delay seconds before retry."
      } else {
        Write-Warning "Instagram request failed on attempt $attempt/$Attempts. Waiting $delay seconds before retry."
      }
      Start-Sleep -Seconds $delay
    }
  }
}

function Download-InstagramImage {
  param(
    [string]$Uri,
    [string]$OutFile,
    [int]$Attempts
  )

  for ($attempt = 1; $attempt -le $Attempts; $attempt++) {
    try {
      Invoke-WebRequest -Uri $Uri -OutFile $OutFile -TimeoutSec 30
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
  "User-Agent"  = "Mozilla/5.0"
}

$api = "https://i.instagram.com/api/v1/users/web_profile_info/?username=$Username"

try {
  $json = Invoke-InstagramRequest -Uri $api -Headers $headers -TimeoutSec 30 -Attempts $MaxAttempts
} catch {
  $statusCode = $null
  if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
    $statusCode = [int]$_.Exception.Response.StatusCode
  }

  if ($statusCode -eq 429) {
    Write-Warning "Instagram sync skipped after repeated rate limits. Existing gallery remains unchanged."
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
  $imgRel = "assets/insta/highlight-$i.jpg"
  $imgTempPath = Join-Path $tempAssetDir "highlight-$i.jpg"

  Download-InstagramImage -Uri $node.display_url -OutFile $imgTempPath -Attempts $MaxAttempts

  $postUrl = if ($node.is_video) {
    "https://www.instagram.com/reel/$($node.shortcode)/"
  } else {
    "https://www.instagram.com/p/$($node.shortcode)/"
  }

  $caption = ""
  if ($node.edge_media_to_caption.edges.Count -gt 0) {
    $caption = $node.edge_media_to_caption.edges[0].node.text
  }

  $caption = ($caption -replace "`r|`n", " ").Trim()
  if ([string]::IsNullOrWhiteSpace($caption)) {
    $caption = "Handmade resin artwork by Twin Soul Studio."
  }

  $title = "Instagram Post #$i"
  $mediaType = if ($node.is_video) { "Reel" } else { "Photo" }
  $commentCount = [int]$node.edge_media_to_comment.count
  $likeCount = [int]$node.edge_liked_by.count
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
Write-Output "Updated $($posts.Count) posts for @$Username"
