document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('searchInput');
    const tableBody = document.getElementById('tableBody');
    const sortFilter = document.getElementById('sortFilter');

    function filterTable() {
        const searchTerm = searchInput.value.toLowerCase();
        const filterValue = sortFilter.value;
        const rows = tableBody.getElementsByTagName('tr');

        for (let row of rows) {
            let found = false;
            const cells = row.getElementsByTagName('td');
            const gender = cells[2].textContent.toLowerCase();
            const date = new Date(cells[5].textContent);

         
            for (let cell of cells) {
                if (cell.textContent.toLowerCase().includes(searchTerm)) {
                    found = true;
                    break;
                }
            }

          
            if (filterValue === 'male' && gender !== 'male') {
                found = false;
            }
            if (filterValue === 'female' && gender !== 'female') {
                found = false;
            }

           
            if (filterValue === 'latest' || filterValue === 'oldest') {
                let dateList = [];
                for (let row of rows) {
                    const dateCell = row.getElementsByTagName('td')[5].textContent;
                    dateList.push({ row, date: new Date(dateCell) });
                }

                dateList.sort((a, b) => {
                    if (filterValue === 'latest') {
                        return b.date - a.date;
                    } else {
                        return a.date - b.date;
                    }
                });

                tableBody.innerHTML = '';
                dateList.forEach(item => tableBody.appendChild(item.row));
                return;
            }

            if (found) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        }
    }

    document.getElementById('searchButton').addEventListener('click', filterTable);

    searchInput.addEventListener('input', function() {
        if (searchInput.value === '') {
            const rows = tableBody.getElementsByTagName('tr');
            for (let row of rows) {
                row.style.display = '';
            }
        } else {
            filterTable();
        }
    });

    sortFilter.addEventListener('change', filterTable);
});