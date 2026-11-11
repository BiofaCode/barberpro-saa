/* Liens vers l'application mobile Kreno.
 *
 * Tant que APP_STORE_URL est vide, les badges « Télécharger dans l'App Store »
 * restent cachés sur le site. Le jour où Apple valide l'app, coller ici le
 * lien de la fiche (App Store Connect → Kreno → Informations sur l'app →
 * « Afficher dans l'App Store »), par ex. https://apps.apple.com/ch/app/kreno/id1234567890
 */
const APP_STORE_URL = '';

(function () {
  if (!/^https:\/\/apps\.apple\.com\//.test(APP_STORE_URL)) return;
  document.querySelectorAll('[data-appstore-link]').forEach(function (a) {
    a.href = APP_STORE_URL;
    a.hidden = false;
  });
})();
