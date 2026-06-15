# Genererer app-ikoner (PNG) fra «Møtet»-symbolet — kjøres på nytt hvis fargene endres
Add-Type -AssemblyName System.Drawing

function New-SammenIcon([int]$size, [string]$path) {
  $f = $size / 100.0
  $bmp = New-Object System.Drawing.Bitmap($size, $size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.Clear([System.Drawing.Color]::Transparent)

  $bg     = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#1f4f4f"))
  $teal   = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#7fb8b8"))
  $coral  = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#e8806a"))
  $white  = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#f5f4f2"))

  # Avrundet kvadrat-bunn (rx = 22 % av bredden)
  $x = 2 * $f; $w = 96 * $f; $r = 22 * $f
  $rect = New-Object System.Drawing.Drawing2D.GraphicsPath
  $rect.AddArc($x, $x, 2*$r, 2*$r, 180, 90)
  $rect.AddArc($x + $w - 2*$r, $x, 2*$r, 2*$r, 270, 90)
  $rect.AddArc($x + $w - 2*$r, $x + $w - 2*$r, 2*$r, 2*$r, 0, 90)
  $rect.AddArc($x, $x + $w - 2*$r, 2*$r, 2*$r, 90, 90)
  $rect.CloseFigure()
  $g.FillPath($bg, $rect)

  # To sirkler (r=20, sentrum 40/60) + felles rom i lys farge
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

  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
  Write-Host "Skrev $path ($size x $size)"
}

New-SammenIcon 180 (Join-Path $PSScriptRoot "ikon-180.png")
New-SammenIcon 192 (Join-Path $PSScriptRoot "ikon-192.png")
New-SammenIcon 512 (Join-Path $PSScriptRoot "ikon-512.png")
