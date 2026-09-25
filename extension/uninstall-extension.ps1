# حذفِ سیاستِ نصبِ افزونهٔ «دستیار زمانی». با دسترسیِ Administrator اجرا شود.
param(
    [string]$ExtensionId = "anbdldacigagfakfjjhfpbcgjdbjdcjn",
    [switch]$Edge
)
$ErrorActionPreference = "SilentlyContinue"
foreach ($vendor in @("Google\Chrome") + $(if ($Edge) { @("Microsoft\Edge") } else { @() })) {
    $base = "HKLM:\SOFTWARE\Policies\$vendor\ExtensionSettings\$ExtensionId"
    if (Test-Path $base) { Remove-Item $base -Recurse -Force; Write-Host "حذف شد: $vendor" -ForegroundColor Green }
}
Write-Host "کروم را ببندید و باز کنید. اگر افزونه با حالت normal نصب شده بود، خودتان هم می‌توانید از chrome://extensions حذفش کنید." -ForegroundColor DarkGray
