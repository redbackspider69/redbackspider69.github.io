fetch('directories.json')
  .then(response => response.json())
  .then(directories => {
    const list = document.getElementById("subdirectoryList");
    directories.forEach(dir => {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = `${dir}/`;
      a.textContent = dir;
      li.appendChild(a);
      list.appendChild(li);
    });
  })
  .catch(err => {
    console.error("Failed to load directories.json", err);
  });