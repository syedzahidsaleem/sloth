param(
    [Parameter(Mandatory=$true)]
    [string]$Message,
    [Parameter(Mandatory=$false)]
    [string]$Scope
)

git add -A
git commit -m "$Message"
