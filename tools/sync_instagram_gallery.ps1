param(
  [string]$Username = "twin_soulstudio",
  [int]$MaxPosts = 24,
  [string]$IndexPath = "index.html"
)

$ErrorActionPreference = "Stop"

function Escape-Html {
  param([string]$Text)
  if ($null -eq $Text) { return "" }
  return $Text.Replace("&", "&amp;").Replace("<", "&lt;").Replace(">", "&gt;").Replace('"', "&quot;")
}

$headers = @{
  "x-ig-app-id" = "936619743392459"
  "User-Agent"  = "Mozilla/5.0"
}

$api = "https://i.instagram.com/api/v1/users/web_profile_info/?username=$Username"
$json = Invoke-RestMethod -Uri $api -Headers $headers -TimeoutSec 30
$posts = $json.data.user.edge_owner_to_timeline_media.edges
if (-not $posts) {
  throw "No posts returned for @$Username"
}

$posts = $posts | Select-Object -First $MaxPosts

$assetDir = Join-Path "assets" "insta"
if (!(Test-Path $assetDir)) {
  New-Item -ItemType Directory -Path $assetDir -Force | Out-Null
}

# Remove old generated images before writing current set.
Get-ChildItem -Path $assetDir -Filter "highlight-*.jpg" -ErrorAction SilentlyContinue | Remove-Item -Force

$cards = New-Object System.Collections.Generic.List[string]
$i = 1
foreach ($edge in $posts) {
  $node = $edge.node
  $imgRel = "assets/insta/highlight-$i.jpg"
  $imgPath = Join-Path $assetDir "highlight-$i.jpg"

  Invoke-WebRequest -Uri $node.display_url -OutFile $imgPath -TimeoutSec 30

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
