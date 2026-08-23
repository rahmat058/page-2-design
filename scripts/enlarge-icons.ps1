Add-Type -AssemblyName System.Drawing

$iconDir = Join-Path $PSScriptRoot '..\public\icons'
$sourcePath = Join-Path $iconDir 'icon-128.png'

$locked = [System.Drawing.Bitmap]::FromFile((Resolve-Path $sourcePath))
$source = New-Object System.Drawing.Bitmap $locked.Width, $locked.Height, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$copy = [System.Drawing.Graphics]::FromImage($source)
$copy.DrawImage($locked, 0, 0, $locked.Width, $locked.Height)
$copy.Dispose()
$locked.Dispose()

function Test-ArtworkPixel([System.Drawing.Color]$pixel) {
  if ($pixel.A -lt 20) { return $false }
  $max = [Math]::Max($pixel.R, [Math]::Max($pixel.G, $pixel.B))
  $min = [Math]::Min($pixel.R, [Math]::Min($pixel.G, $pixel.B))
  $luma = (0.299 * $pixel.R) + (0.587 * $pixel.G) + (0.114 * $pixel.B)
  $sat = if ($max -eq 0) { 0 } else { ($max - $min) / $max }
  return ($luma -gt 96) -or ($sat -gt 0.5 -and $luma -gt 88)
}

$minX = $source.Width
$minY = $source.Height
$maxX = -1
$maxY = -1

$edge = [Math]::Max(4, [int][Math]::Round($source.Width * 0.08))
for ($y = $edge; $y -lt $source.Height - $edge; $y++) {
  for ($x = $edge; $x -lt $source.Width - $edge; $x++) {
    $pixel = $source.GetPixel($x, $y)
    if (Test-ArtworkPixel $pixel) {
      if ($x -lt $minX) { $minX = $x }
      if ($y -lt $minY) { $minY = $y }
      if ($x -gt $maxX) { $maxX = $x }
      if ($y -gt $maxY) { $maxY = $y }
    }
  }
}

if ($maxX -lt 0) {
  $source.Dispose()
  throw 'Could not find icon artwork to enlarge.'
}

Write-Output "Artwork bounds: $minX,$minY $($maxX - $minX + 1)x$($maxY - $minY + 1) of $($source.Width)x$($source.Height)"

$glow = 6
$minX = [Math]::Max(0, $minX - $glow)
$minY = [Math]::Max(0, $minY - $glow)
$maxX = [Math]::Min($source.Width - 1, $maxX + $glow)
$maxY = [Math]::Min($source.Height - 1, $maxY + $glow)

$contentW = $maxX - $minX + 1
$contentH = $maxY - $minY + 1
$square = [Math]::Max($contentW, $contentH)
$crop = New-Object System.Drawing.Bitmap $square, $square, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$bg = [System.Drawing.Color]::FromArgb(255, 7, 14, 26)
$fill = [System.Drawing.Graphics]::FromImage($crop)
$fill.Clear($bg)
$offsetX = [int](($square - $contentW) / 2)
$offsetY = [int](($square - $contentH) / 2)
$fill.DrawImage(
  $source,
  (New-Object System.Drawing.Rectangle $offsetX, $offsetY, $contentW, $contentH),
  (New-Object System.Drawing.Rectangle $minX, $minY, $contentW, $contentH),
  [System.Drawing.GraphicsUnit]::Pixel
)
$fill.Dispose()
$source.Dispose()

function Save-Icon([int]$size, [string]$path) {
  $dest = New-Object System.Drawing.Bitmap $size, $size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $gfx = [System.Drawing.Graphics]::FromImage($dest)
  $gfx.Clear($bg)
  $gfx.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $gfx.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $gfx.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $inset = [Math]::Max(1, [int][Math]::Round($size * 0.03))
  $box = $size - (2 * $inset)
  $gfx.DrawImage($crop, $inset, $inset, $box, $box)
  $gfx.Dispose()
  $dest.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $dest.Dispose()
}

Save-Icon 128 (Join-Path $iconDir 'icon-128.png')
Save-Icon 48 (Join-Path $iconDir 'icon-48.png')
Save-Icon 32 (Join-Path $iconDir 'icon-32.png')
Save-Icon 16 (Join-Path $iconDir 'icon-16.png')
$crop.Dispose()

Write-Output 'Enlarged icons written to public/icons'
