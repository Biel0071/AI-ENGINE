(() => {
  const button = document.createElement('button');
  button.id = 'fenixReturnCity'; button.type = 'button';
  button.setAttribute('aria-label', 'Voltar ao ponto anterior da Cidade');
  const icon = document.createElement('span'); icon.setAttribute('aria-hidden', 'true'); icon.textContent = '←';
  const label = document.createElement('span'); label.textContent = 'Voltar à Cidade';
  button.append(icon, label);
  button.addEventListener('click', () => window.showView?.('city'));
  document.body.append(button);
  const key = 'fenix_city_return_available';
  window.fenixUpdateCityReturn = (viewId, cameFromCity = false) => {
    if (viewId === 'city') sessionStorage.removeItem(key);
    else if (cameFromCity) sessionStorage.setItem(key, 'true');
    button.hidden = viewId === 'city' || sessionStorage.getItem(key) !== 'true';
  };
  window.fenixUpdateCityReturn(location.hash.replace(/^#/, '').split('?')[0]);
})();
