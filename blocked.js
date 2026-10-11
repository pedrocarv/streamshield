'use strict';
document.getElementById('back').addEventListener('click', () => history.back());
if (history.length > 1) setTimeout(() => history.back(), 700);
