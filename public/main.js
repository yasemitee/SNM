const select = (el, all = false) => {
  el = el.trim();
  if (all) {
    return [...document.querySelectorAll(el)];
  } else {
    return document.querySelector(el);
  }
};

const on = (type, el, listener, all = false) => {
  if (all) {
    select(el, all).forEach((e) => e.addEventListener(type, listener));
  } else {
    select(el, all).addEventListener(type, listener);
  }
};

const onscroll = (el, listener) => {
  el.addEventListener('scroll', listener);
};

if (select('.toggle-sidebar-btn')) {
  on('click', '.toggle-sidebar-btn', function (e) {
    select('body').classList.toggle('toggle-sidebar');
  });
}

(async () => {
  const usernameHeader = document.getElementById('usernameHeader');
  const nominativoHeader = document.getElementById('nominativoHeader');
  try {
    const response = await fetch('/get-user-info', {
      method: 'GET',
    });
    if (response.ok) {
      const r = await response.json();
      usernameHeader.innerHTML = r.data.username;
      nominativoHeader.innerHTML = r.data.nome + ' ' + r.data.cognome;
    }
  } catch (error) {
    console.log(error);
  }
})();
