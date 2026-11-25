const file = document.querySelector('input[name="file"]');
if (file)
  file.addEventListener('change', () => {
    const maximum = Number(file.dataset.maximum);
    file.setCustomValidity(
      file.files[0]?.size > maximum ? 'This file exceeds the upload size limit.' : '',
    );
  });
