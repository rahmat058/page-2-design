Add-Type -AssemblyName System.Drawing

$iconDir = Join-Path $PSScriptRoot '..\public\icons'
New-Item -ItemType Directory -Force -Path $iconDir | Out-Null

function New-RoundedRect([int]$x, [int]$y, [int]$w, [int]$h, [int]$r) {
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $radius = [Math]::Max(1, [Math]::Min($r, [Math]::Min([int]($w / 2), [int]($h / 2))))
  $d = $radius * 2
  $path.AddArc($x, $y, $d, $d, 180, 90)
  $path.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $path.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
  $path.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $path.CloseFigure()
  return $path
}

function New-PointF([double]$x, [double]$y) {
  return [System.Drawing.PointF]::new([float]$x, [float]$y)
}

function Add-ArrowPath([System.Drawing.Drawing2D.GraphicsPath]$path, [single]$x, [single]$y, [single]$w, [single]$h) {
  $shaftTop = $y + $h * 0.32
  $shaftBot = $y + $h * 0.68
  $headX = $x + $w * 0.52
  $path.AddPolygon(@(
    (New-PointF $x $shaftTop),
    (New-PointF $headX $shaftTop),
    (New-PointF $headX $y),
    (New-PointF ($x + $w) ($y + $h / 2)),
    (New-PointF $headX ($y + $h)),
    (New-PointF $headX $shaftBot),
    (New-PointF $x $shaftBot)
  ))
}

function Paint-Master([int]$size) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

  $s = [single]$size
  $bg = [System.Drawing.Color]::FromArgb(255, 11, 24, 42)
  $g.Clear([System.Drawing.Color]::FromArgb(0, 0, 0, 0))

  $card = New-RoundedRect 0 0 $size $size ([int]($s * 0.20))
  $cardBrush = New-Object System.Drawing.SolidBrush $bg
  $g.FillPath($cardBrush, $card)
  $cardBrush.Dispose()

  $glow = New-Object System.Drawing.Drawing2D.GraphicsPath
  $glow.AddEllipse([single]($s * 0.36), [single](-$s * 0.18), [single]($s * 0.82), [single]($s * 0.52))
  $glowBrush = New-Object System.Drawing.Drawing2D.PathGradientBrush $glow
  $glowBrush.CenterColor = [System.Drawing.Color]::FromArgb(90, 45, 212, 191)
  $glowBrush.SurroundColors = @([System.Drawing.Color]::FromArgb(0, 11, 24, 42))
  $g.FillPath($glowBrush, $glow)
  $glowBrush.Dispose()
  $glow.Dispose()

  $tilePen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(160, 20, 184, 166), [single][Math]::Max(2, $s * 0.03))
  $g.DrawPath($tilePen, $card)
  $tilePen.Dispose()
  $card.Dispose()

  $pageX = [int]($s * 0.05)
  $pageY = [int]($s * 0.08)
  $pageW = [int]($s * 0.42)
  $pageH = [int]($s * 0.84)
  $page = New-RoundedRect $pageX $pageY $pageW $pageH ([int]($s * 0.06))
  $pageBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 248, 250, 252))
  $g.FillPath($pageBrush, $page)
  $pageBrush.Dispose()
  $page.Dispose()

  $fold = New-Object System.Drawing.Drawing2D.GraphicsPath
  $foldSize = $s * 0.12
  $fold.AddPolygon(@(
    (New-PointF ($pageX + $pageW - 1) $pageY),
    (New-PointF ($pageX + $pageW - 1 - $foldSize) $pageY),
    (New-PointF ($pageX + $pageW - 1) ($pageY + $foldSize))
  ))
  $foldBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 20, 184, 166))
  $g.FillPath($foldBrush, $fold)
  $foldBrush.Dispose()
  $fold.Dispose()

  $lineBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 148, 163, 184))
  $lineX = [int]($pageX + $s * 0.07)
  $lineW = [int]($pageW - $s * 0.14)
  foreach ($i in 0..3) {
    $lineY = [int]($pageY + $s * 0.22 + $i * $s * 0.10)
    $width = if ($i -eq 3) { [int]($lineW * 0.62) } else { $lineW }
    $g.FillRectangle($lineBrush, $lineX, $lineY, $width, [int][Math]::Max(2, $s * 0.035))
  }
  $lineBrush.Dispose()

  $arrow = New-Object System.Drawing.Drawing2D.GraphicsPath
  Add-ArrowPath $arrow ([single]($s * 0.37)) ([single]($s * 0.32)) ([single]($s * 0.30)) ([single]($s * 0.36))
  $arrowBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush (
    (New-PointF ($s * 0.37) ($s * 0.5)),
    (New-PointF ($s * 0.67) ($s * 0.5)),
    [System.Drawing.Color]::FromArgb(255, 20, 184, 166),
    [System.Drawing.Color]::FromArgb(255, 163, 230, 53)
  )
  $g.FillPath($arrowBrush, $arrow)
  $arrowBrush.Dispose()
  $arrow.Dispose()

  $canvasX = [int]($s * 0.53)
  $canvasY = [int]($s * 0.08)
  $canvasW = [int]($s * 0.42)
  $canvasH = [int]($s * 0.84)
  $canvas = New-RoundedRect $canvasX $canvasY $canvasW $canvasH ([int]($s * 0.05))
  $canvasFill = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 11, 18, 32))
  $g.FillPath($canvasFill, $canvas)
  $canvasFill.Dispose()
  $border = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 34, 197, 94), [single][Math]::Max(2, $s * 0.035))
  $border.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  $g.DrawPath($border, $canvas)
  $border.Dispose()
  $canvas.Dispose()

  $handle = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 74, 222, 128))
  $hs = [int][Math]::Max(3, $s * 0.055)
  foreach ($pt in @(
    @($canvasX, $canvasY),
    @(($canvasX + $canvasW - $hs), $canvasY),
    @($canvasX, ($canvasY + $canvasH - $hs)),
    @(($canvasX + $canvasW - $hs), ($canvasY + $canvasH - $hs))
  )) {
    $g.FillRectangle($handle, [int]$pt[0], [int]$pt[1], $hs, $hs)
  }
  $handle.Dispose()

  $block = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 74, 222, 128))
  $g.FillRectangle($block, [int]($canvasX + $s * 0.07), [int]($canvasY + $s * 0.12), [int]($s * 0.13), [int]($s * 0.13))
  $block.Dispose()
  $dot = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 250, 204, 21))
  $g.FillEllipse($dot, [int]($canvasX + $s * 0.23), [int]($canvasY + $s * 0.15), [int]($s * 0.09), [int]($s * 0.09))
  $dot.Dispose()

  $typeBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 248, 250, 252))
  $fontSize = [Math]::Max(8, $s * 0.16)
  $font = New-Object System.Drawing.Font 'Segoe UI', $fontSize, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
  $g.DrawString('T', $font, $typeBrush, [single]($canvasX + $s * 0.08), [single]($canvasY + $s * 0.32))
  $font.Dispose()
  $typeBrush.Dispose()

  $g.Dispose()
  return $bmp
}

function Save-Icon([System.Drawing.Bitmap]$master, [int]$size, [string]$path) {
  $dest = New-Object System.Drawing.Bitmap $size, $size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $gfx = [System.Drawing.Graphics]::FromImage($dest)
  $gfx.Clear([System.Drawing.Color]::FromArgb(0, 0, 0, 0))
  $gfx.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $gfx.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $gfx.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $gfx.DrawImage($master, 0, 0, $size, $size)
  $gfx.Dispose()
  $dest.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $dest.Dispose()
}

$master = Paint-Master 256
Save-Icon $master 128 (Join-Path $iconDir 'icon-128.png')
Save-Icon $master 48 (Join-Path $iconDir 'icon-48.png')
Save-Icon $master 32 (Join-Path $iconDir 'icon-32.png')
Save-Icon $master 16 (Join-Path $iconDir 'icon-16.png')
$master.Dispose()

Write-Output 'Brand icons painted to public/icons'
