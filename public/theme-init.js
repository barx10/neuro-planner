// Unngå hvitt blink før innstillingene er lastet. Egen fil fordi CSP ikke tillater inline-skript.
if (matchMedia('(prefers-color-scheme: dark)').matches) document.documentElement.classList.add('dark')
