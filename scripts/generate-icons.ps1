param()

$ErrorActionPreference = 'Stop'
$publicDir = 'e:\SNCRM\client\public'
if (-not (Test-Path $publicDir)) {
    New-Item -ItemType Directory -Force -Path $publicDir | Out-Null
}

Add-Type -AssemblyName System.Drawing

$srcPath = 'C:\Users\NAJBUDEEN\.gemini\antigravity-ide\brain\ab606c92-229b-4fbc-a30b-361c2686dfec\.user_uploaded\media_1792489688998.jpg'
$srcImg = [System.Drawing.Image]::FromFile($srcPath)

Copy-Item $srcPath (Join-Path $publicDir 'tab-icon-original.jpg') -Force

function Create-SquareIcon {
    param(
        [int]$targetSize,
        [string]$fileName,
        [bool]$transparent = $false
    )
    $outPath = Join-Path $publicDir $fileName
    $bmp = New-Object System.Drawing.Bitmap($targetSize, $targetSize, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    
    if (-not $transparent) {
        $g.Clear([System.Drawing.Color]::White)
    } else {
        $g.Clear([System.Drawing.Color]::Transparent)
    }

    $padding = [int]($targetSize * 0.04)
    $availW = $targetSize - (2 * $padding)
    $availH = $targetSize - (2 * $padding)
    
    $srcRatio = $srcImg.Width / $srcImg.Height
    $targetRatio = $availW / $availH

    if ($srcRatio -gt $targetRatio) {
        $drawW = $availW
        $drawH = [int]($availW / $srcRatio)
    } else {
        $drawH = $availH
        $drawW = [int]($availH * $srcRatio)
    }

    $drawX = [int](($targetSize - $drawW) / 2)
    $drawY = [int](($targetSize - $drawH) / 2)

    $rect = New-Object System.Drawing.Rectangle($drawX, $drawY, $drawW, $drawH)
    $g.DrawImage($srcImg, $rect)
    $g.Dispose()

    if ($transparent) {
        for ($y = 0; $y -lt $bmp.Height; $y++) {
            for ($x = 0; $x -lt $bmp.Width; $x++) {
                $c = $bmp.GetPixel($x, $y)
                if ($c.R -gt 240 -and $c.G -gt 240 -and $c.B -gt 240) {
                    $bmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 255, 255, 255))
                }
            }
        }
    }

    if ($fileName.EndsWith('.ico')) {
        $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Icon)
    } else {
        $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    }
    $bmp.Dispose()
    Write-Host "Created: $outPath"
}

Create-SquareIcon 512 'tab-icon.png' $false
Create-SquareIcon 512 'tab-icon-transparent.png' $true
Create-SquareIcon 192 'logo192.png' $false
Create-SquareIcon 32 'favicon-32x32.png' $false
Create-SquareIcon 16 'favicon-16x16.png' $false
Create-SquareIcon 32 'favicon.ico' $false

$srcImg.Dispose()
Write-Host "Done!"
