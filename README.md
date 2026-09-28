# OCaml-live Extension For Quarto

Cette extension pour [Quarto](https://quarto.org) transforme les blocs [OCaml](https://ocaml.org) en cellules modifiables avec [CodeMirror](https://codemirror.net), dans les sorties live-html.
Les sorties HTML classique et PDF ne sont pas modifiées.

----

## Installing

```bash
quarto add Naereen/quarto-ocaml-live
```

This will install the extension under the `_extensions` subdirectory.
If you're using version control, you will want to check in this directory.

----

## Using

Le kernel Basthon est initialisé de façon asynchrone via son API principale et son worker Comlink. Les boutons d'exécution ne sont activés qu'une fois le kernel prêt; les sorties standard et d'erreur sont affichées séparément.

Voir [example.qmd](example.qmd) pour un exemple de document.

----

## :scroll: License ? [![GitHub license](https://img.shields.io/github/license/Naereen/quarto-ocaml-live.svg)](https://github.com/Naereen/quarto-ocaml-live/blob/master/LICENSE)

[MIT Licensed](https://lbesson.mit-license.org/) (file [LICENSE](LICENSE)).
© [Lilian Besson](https://GitHub.com/Naereen), septembre 2026.

[![Maintenance](https://img.shields.io/badge/Maintained%3F-yes-green.svg)](https://GitHub.com/Naereen/quarto-ocaml-live/graphs/commit-activity)
[![Ask Me Anything !](https://img.shields.io/badge/Ask%20me-anything-1abc9c.svg)](https://GitHub.com/Naereen/ama)
[![Analytics](https://ga-beacon.appspot.com/UA-38514290-17/github.com/Naereen/quarto-ocaml-live/README.md?pixel)](https://GitHub.com/Naereen/quarto-ocaml-live/)

[![ForTheBadge built-with-swag](http://ForTheBadge.com/images/badges/built-with-swag.svg)](https://GitHub.com/Naereen/)

[![ForTheBadge uses-badges](http://ForTheBadge.com/images/badges/uses-badges.svg)](http://ForTheBadge.com)
[![ForTheBadge uses-git](http://ForTheBadge.com/images/badges/uses-git.svg)](https://GitHub.com/)
[![ForTheBadge uses-css](http://ForTheBadge.com/images/badges/uses-css.svg)](http://ForTheBadge.com)
[![ForTheBadge uses-html](http://ForTheBadge.com/images/badges/uses-html.svg)](http://ForTheBadge.com)
[![ForTheBadge uses-js](http://ForTheBadge.com/images/badges/uses-js.svg)](http://ForTheBadge.com)


