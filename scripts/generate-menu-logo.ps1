param()

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$srcPath = 'C:\Users\NAJBUDEEN\.gemini\antigravity-ide\brain\ab606c92-229b-4fbc-a30b-361c2686dfec\.user_uploaded\media_1792489715323.png'
$publicDir = 'e:\SNCRM\client\public'

# 1. Save original copy directly as menu-logo.png and menu-logo-original.png
Copy-Item $srcPath (Join-Path $publicDir 'menu-logo.png') -Force
Copy-Item $srcPath (Join-Path $publicDir 'menu-logo-original.png') -Force

# 2. Generate dark-mode version (bright text + luminous blue)
$bmp = New-Object System.Drawing.Bitmap($srcPath)
$darkBmp = New-Object System.Drawing.Bitmap($bmp.Width, $bmp.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

for ($y = 0; $y -lt $bmp.Height; $y++) {
    for ($x = 0; $x -lt $bmp.Width; $x++) {
        $c = $bmp.GetPixel($x, $y)
        if ($c.A -gt 15) {
            # Is it the black tagline?
            if ($c.R -lt 70 -and $c.G -lt 70 -and $c.B -lt 70) {
                # Convert to light silver/white #E2E8F0
                $darkBmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($c.A, 226, 232, 240))
            } elseif ($c.B -gt 100) {
                # Brand blue: brighten for dark backgrounds
                $r = [Math]::Min(255, [int]($c.R * 1.4 + 40))
                $g = [Math]::Min(255, [int]($c.G * 1.6 + 60))
                $b = [Math]::Min(255, [int]($c.B * 1.1 + 80))
                $darkBmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($c.A, $r, $g, $b))
            } else {
                $darkBmp.SetPixel($x, $y, $c)
            }
        } else {
            $darkBmp.SetPixel($x, $y, [System.Drawing.Color]::Transparent)
        }
    }
}
$darkBmp.Save((Join-Path $publicDir 'menu-logo-dark.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$darkBmp.Dispose()

# 3. Generate white card backdrop version (clean white pill container)
$padX = 30
$padY = 16
$cardW = $bmp.Width + ($padX * 2)
$cardH = $bmp.Height + ($padY * 2)
$cardBmp = New-Object System.Drawing.Bitmap($cardW, $cardH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($cardBmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.Clear([System.Drawing.Color]::Transparent)

# Draw soft white background
$brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 255, 255, 255))
$g.FillRectangle($brush, 0, 0, $cardW, $cardH)
$g.DrawImage($bmp, $padX, $padY, $bmp.Width, $bmp.Height)
$g.Dispose()
$brush.Dispose()
$cardBmp.Save((Join-Path $publicDir 'menu-logo-card.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$cardBmp.Dispose()

$bmp.Dispose()
Write-Host 'Generated all menu-logo variants successfully!'
