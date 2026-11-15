/* Library filters: show or hide the filter panel and narrow a list.
   Markup: a button with data-filter-toggle and aria-controls naming the panel; the panel holds
   select elements with data-filter="name", a data-filter-clear button, and a data-filter-count line,
   and its data-filter-items attribute is a selector for the list items. Each item lists its values
   in data-name, separated by spaces. An optional element with data-filter-none shows when nothing matches. */
(function () {
  var toggle = document.querySelector('[data-filter-toggle]');
  var panel = toggle ? document.getElementById(toggle.getAttribute('aria-controls')) : null;
  if (!panel) return;
  var selects = Array.prototype.slice.call(panel.querySelectorAll('select[data-filter]'));
  var items = Array.prototype.slice.call(document.querySelectorAll(panel.getAttribute('data-filter-items')));
  var clear = panel.querySelector('[data-filter-clear]');
  var count = panel.querySelector('[data-filter-count]');
  var none = document.querySelector('[data-filter-none]');
  var noun = panel.getAttribute('data-noun') || 'items';

  toggle.hidden = false;
  toggle.addEventListener('click', function () {
    var opening = panel.hidden;
    panel.hidden = !opening;
    toggle.setAttribute('aria-expanded', String(opening));
    toggle.textContent = opening ? 'Hide filters' : 'Show filters';
    if (opening && selects.length) selects[0].focus();
  });

  function apply() {
    var shown = 0;
    items.forEach(function (item) {
      var match = selects.every(function (select) {
        if (!select.value) return true;
        var values = (item.getAttribute('data-' + select.getAttribute('data-filter')) || '').split(/\s+/);
        return values.indexOf(select.value) !== -1;
      });
      item.hidden = !match;
      if (match) shown += 1;
    });
    if (count) count.textContent = 'Showing ' + shown + ' of ' + items.length + ' ' + noun + '.';
    if (none) none.hidden = shown !== 0;
  }

  selects.forEach(function (select) { select.addEventListener('change', apply); });
  if (clear) {
    clear.addEventListener('click', function () {
      selects.forEach(function (select) { select.value = ''; });
      apply();
      if (selects.length) selects[0].focus();
    });
  }
  apply();
})();
