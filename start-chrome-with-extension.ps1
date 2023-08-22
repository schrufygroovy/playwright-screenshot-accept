$indexPath = ([System.Uri](Get-Item "index.html").FullName).AbsoluteUri

Start-Process chrome -ArgumentList ($indexPath, "--load-extension=C:/src/playwright-screenshot-accept", "--allow-file-access-from-files")
