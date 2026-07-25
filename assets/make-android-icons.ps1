# Genererer 1024x1024 kildebilder for @capacitor/assets (Android adaptive icon)
# Kjores en gang, deretter: npx @capacitor/assets generate --android
Add-Type -AssemblyName System.Drawing

$bgHex    = "#1F4F4F"
$tealHex  = "#7FB8B8"
$coralHex = "#E8806A"
$whiteHex = "#F5F4F2"

function New-Circles([System.Drawing.Graphics]$g, [double]$f) {
  $teal   = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml($tealHex))
  $coral  = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml($coralHex))
  $white  = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml($whiteHex))
  $rad = 20 * $f
  $c1 = New-Object System.Drawing.RectangleF((40*$f - $rad), (50*$f - $rad), (2*$rad), (2*$rad))
  $c2 = New-Object System.Drawing.RectangleF((60*$f - $rad), (50*$f - $rad), (2*$rad), (2*$rad))
  $g.FillEllipse($teal, $c1)
  $g.FillEllipse($coral, $c2)
  $clip = New-Object System.Drawing.Drawing2D.GraphicsPath
  $clip.AddEllipse($c1)
  $g.SetClip($clip)
  $g.FillEllipse($white, $c2)
  $g.ResetClip()
}

$size = 1024
$f = $size / 100.0

# 1) icon.png - full combined legacy icon (opaque, rounded square bg)
$bmp = New-Object System.Drawing.Bitmap($size, $size)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.Clear([System.Drawing.ColorTranslator]::FromHtml($bgHex))
$bgBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml($bgHex))
$x = 2 * $f; $w = 96 * $f; $r = 22 * $f
$rect = New-Object System.Drawing.Drawing2D.GraphicsPath
$rect.AddArc($x, $x, 2*$r, 2*$r, 180, 90)
$rect.AddArc($x + $w - 2*$r, $x, 2*$r, 2*$r, 270, 90)
$rect.AddArc($x + $w - 2*$r, $x + $w - 2*$r, 2*$r, 2*$r, 0, 90)
$rect.AddArc($x, $x + $w - 2*$r, 2*$r, 2*$r, 90, 90)
$rect.CloseFigure()
$g.FillPath($bgBrush, $rect)
New-Circles -g $g -f $f
$bmp.Save("$PSScriptRoot\icon.png", [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()

# 2) icon-background.png - flat full-bleed color, no shape (Android applies its own mask)
$bmp = New-Object System.Drawing.Bitmap($size, $size)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.Clear([System.Drawing.ColorTranslator]::FromHtml($bgHex))
$bmp.Save("$PSScriptRoot\icon-background.png", [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()

# 3) icon-foreground.png - transparent bg, glyph only, sits inside adaptive-icon safe zone
$bmp = New-Object System.Drawing.Bitmap($size, $size)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.Clear([System.Drawing.Color]::Transparent)
New-Circles -g $g -f $f
$bmp.Save("$PSScriptRoot\icon-foreground.png", [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()

Write-Host "Skrev icon.png, icon-background.png, icon-foreground.png (1024x1024) i $PSScriptRoot"
