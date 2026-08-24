# Generator banner Open Graph (1200x630 JPG) untuk preview link di WhatsApp/Facebook/Twitter
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$out = Join-Path (Split-Path $PSScriptRoot -Parent) "img\og-banner.jpg"
$w = 1200; $h = 630

$bmp = New-Object System.Drawing.Bitmap($w, $h)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

# Background gradient hijau khas HekaaPedia
$bgRect = New-Object System.Drawing.Rectangle(0, 0, $w, $h)
$bg = New-Object System.Drawing.Drawing2D.LinearGradientBrush($bgRect, [System.Drawing.Color]::FromArgb(18,163,134), [System.Drawing.Color]::FromArgb(6,78,68), 45)
$g.FillRectangle($bg, $bgRect)

# Lingkaran dekoratif transparan
$deco = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(22,255,255,255))
$g.FillEllipse($deco, 870, -190, 540, 540)
$g.FillEllipse($deco, -150, 430, 410, 410)

# ---- Permata (diamond) di kanan ----
$cx = 990; $cy = 285
$pts = @(
  (New-Object System.Drawing.Point(($cx-88), ($cy-58))),
  (New-Object System.Drawing.Point(($cx+88), ($cy-58))),
  (New-Object System.Drawing.Point(($cx+140), ($cy-4))),
  (New-Object System.Drawing.Point($cx, ($cy+128))),
  (New-Object System.Drawing.Point(($cx-140), ($cy-4)))
)
$gem = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(64,205,255))
$g.FillPolygon($gem, [System.Drawing.Point[]]$pts)
$pen = New-Object System.Drawing.Pen([System.Drawing.Color]::White, 5)
$g.DrawPolygon($pen, [System.Drawing.Point[]]$pts)
$pen2 = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(160,255,255,255), 3)
$g.DrawLine($pen2, ($cx-88), ($cy-58), ($cx-48), ($cy-4))
$g.DrawLine($pen2, ($cx+88), ($cy-58), ($cx+48), ($cy-4))
$g.DrawLine($pen2, ($cx-48), ($cy-4), $cx, ($cy+128))
$g.DrawLine($pen2, ($cx+48), ($cy-4), $cx, ($cy+128))
$g.DrawLine($pen2, ($cx-48), ($cy-4), ($cx+48), ($cy-4))
$g.DrawLine($pen2, ($cx-140), ($cy-4), ($cx-48), ($cy-4))
$g.DrawLine($pen2, ($cx+48), ($cy-4), ($cx+140), ($cy-4))

# ---- Petir kuning ----
$bx = 820; $by = 165
$bolt = @(
  (New-Object System.Drawing.Point($bx, ($by-70))),
  (New-Object System.Drawing.Point(($bx+42), ($by-70))),
  (New-Object System.Drawing.Point(($bx+16), ($by-12))),
  (New-Object System.Drawing.Point(($bx+48), ($by-12))),
  (New-Object System.Drawing.Point(($bx-8), ($by+70))),
  (New-Object System.Drawing.Point(($bx+10), ($by-2))),
  (New-Object System.Drawing.Point(($bx-22), ($by-2)))
)
$yel = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255,217,74))
$g.FillPolygon($yel, [System.Drawing.Point[]]$bolt)

# ---- Teks brand: Hekaa (putih) + Pedia (kuning) ----
$fBrand = New-Object System.Drawing.Font('Segoe UI Black', 116, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$fSub   = New-Object System.Drawing.Font('Segoe UI', 38, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$fTag   = New-Object System.Drawing.Font('Segoe UI', 30, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$fDom   = New-Object System.Drawing.Font('Segoe UI Semibold', 28, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)

$white = [System.Drawing.Brushes]::White
$g.DrawString('Hekaa', $fBrand, $white, 70, 95)
$wHekaa = $g.MeasureString('Hekaa', $fBrand).Width
$g.DrawString('Pedia', $fBrand, $yel, (70 + $wHekaa - 14), 95)

$g.DrawString('Top Up Game, Pulsa & Token Listrik', $fSub, $white, 76, 275)
$g.DrawString('TERMURAH  -  PROSES CEPAT  -  AMAN 24/7', $fTag, $yel, 76, 340)

# ---- Badge kaca produk ----
function New-RoundRect([int]$x, [int]$y, [int]$wd, [int]$ht, [int]$r) {
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $p.AddArc($x, $y, 2*$r, 2*$r, 180, 90)
  $p.AddArc($x + $wd - 2*$r, $y, 2*$r, 2*$r, 270, 90)
  $p.AddArc($x + $wd - 2*$r, $y + $ht - 2*$r, 2*$r, 2*$r, 0, 90)
  $p.AddArc($x, $y + $ht - 2*$r, 2*$r, 2*$r, 90, 90)
  $p.CloseFigure()
  return $p
}
$fBadge = New-Object System.Drawing.Font('Segoe UI', 26, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$glass = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(38,255,255,255))
$bx0 = 76; $by0 = 425
foreach ($label in @('Mobile Legends','Free Fire','Roblox','Pulsa','Token PLN')) {
  $sz = $g.MeasureString($label, $fBadge)
  $bw = [int]($sz.Width) + 36; $bh = 54
  $path = New-RoundRect $bx0 $by0 $bw $bh 27
  $g.FillPath($glass, $path)
  $g.DrawString($label, $fBadge, $white, ($bx0 + 18), ($by0 + 10))
  $bx0 += $bw + 14
}

# ---- Domain ----
$domBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(225,255,255,255))
$g.DrawString('hekaapedia.web.app', $fDom, $domBrush, 76, 545)

$g.Dispose()
$bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Jpeg)
$bmp.Dispose()
Write-Output ("OG banner tersimpan: {0} ({1} KB)" -f $out, [math]::Round((Get-Item $out).Length / 1KB))