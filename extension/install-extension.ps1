# نصبِ افزونهٔ «دستیار زمانی» روی سیستمِ کاربر با به‌روزرسانیِ خودکار (بدونِ فروشگاه).
# با دسترسیِ Administrator اجرا شود. به کروم می‌گوید افزونه را از سایتِ شما نصب و خودکار به‌روز کند.
#
#   powershell -ExecutionPolicy Bypass -File .\install-extension.ps1 -SiteBaseUrl "https://example.com/zamani"
#
# پیش‌نیاز: فایل‌های zamani.crx و updates.xml را روی همان SiteBaseUrl گذاشته باشید.

param(
    [string]$SiteBaseUrl = "https://zamani.tax/extension",
    [string]$ExtensionId = "anbdldacigagfakfjjhfpbcgjdbjdcjn",
    [ValidateSet("normal_installed","force_installed")]
    [string]$Mode = "normal_installed",   # normal = کاربر می‌تواند حذف کند؛ force = همیشه نصب می‌ماند
    [switch]$Edge                          # علاوه بر Chrome، برای Edge هم تنظیم کن
)
$ErrorActionPreference = "Stop"
$updateUrl = $SiteBaseUrl.TrimEnd('/') + "/updates.xml"

function Set-ExtPolicy([string]$vendorPath) {
    $base = "HKLM:\SOFTWARE\Policies\$vendorPath\ExtensionSettings\$ExtensionId"
    New-Item -Path $base -Force | Out-Null
    New-ItemProperty -Path $base -Name "installation_mode" -Value $Mode      -PropertyType String -Force | Out-Null
    New-ItemProperty -Path $base -Name "update_url"        -Value $updateUrl -PropertyType String -Force | Out-Null
    Write-Host "تنظیم شد: $vendorPath  (حالت: $Mode)" -ForegroundColor Green
}

Write-Host "==> نصبِ سیاستِ افزونه (شناسه: $ExtensionId)" -ForegroundColor Cyan
Set-ExtPolicy "Google\Chrome"
if ($Edge) { Set-ExtPolicy "Microsoft\Edge" }

Write-Host ""
Write-Host "انجام شد. حالا:" -ForegroundColor Cyan
Write-Host "  ۱) کروم را کامل ببندید و دوباره باز کنید (یا در chrome://policy روی Reload policies بزنید)."
Write-Host "  ۲) کروم افزونه را از سایتِ شما نصب می‌کند و از این پس خودکار به‌روزرسانی می‌شود."
Write-Host "  به‌روزرسانی: کروم هر چند ساعت $updateUrl را چک می‌کند." -ForegroundColor DarkGray
