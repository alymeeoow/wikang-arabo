document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('searchInput');
    const tableBody = document.getElementById('tableBody');
    const sortFilter = document.getElementById('sortFilter');

    function filterTable() {
    const searchTerm = searchInput.value.toLowerCase();
    const selectedOption = sortFilter.value;

    const rows = tableBody.getElementsByTagName('tr');
    const rowsArray = Array.from(rows);

    rowsArray.forEach(row => {
        const genderCell = row.getElementsByTagName('td')[2];
        const statusCell = row.getElementsByTagName('td')[5];
        const dateCell = row.getElementsByTagName('td')[3];

      
        let shouldDisplay = true;
        if (selectedOption !== 'none') {
            switch (selectedOption) {
                case 'highest':
                    rowsArray.sort((a, b) => {
                        const scoreA = parseInt(a.getElementsByTagName('td')[4].textContent);
                        const scoreB = parseInt(b.getElementsByTagName('td')[4].textContent);
                        return scoreB - scoreA;
                    });
                    break;
                case 'lowest':
                    rowsArray.sort((a, b) => {
                        const scoreA = parseInt(a.getElementsByTagName('td')[4].textContent);
                        const scoreB = parseInt(b.getElementsByTagName('td')[4].textContent);
                        return scoreA - scoreB;
                    });
                    break;
                case 'passed':
                    shouldDisplay = statusCell.textContent.toLowerCase() === 'passed';
                    break;
                case 'failed':
                    shouldDisplay = statusCell.textContent.toLowerCase() === 'failed';
                    break;
                case 'male':
                    shouldDisplay = genderCell.textContent.trim().toLowerCase() === 'male';
                    break;
                case 'female':
                    shouldDisplay = genderCell.textContent.trim().toLowerCase() === 'female';
                    break;
                case 'latest':
                    rowsArray.sort((a, b) => {
                        const dateA = new Date(a.getElementsByTagName('td')[3].textContent);
                        const dateB = new Date(b.getElementsByTagName('td')[3].textContent);
                        return dateB - dateA; // Sort by descending order (latest first)
                    });
                    break;
                case 'oldest':
                    rowsArray.sort((a, b) => {
                        const dateA = new Date(a.getElementsByTagName('td')[3].textContent);
                        const dateB = new Date(b.getElementsByTagName('td')[3].textContent);
                        return dateA - dateB; 
                    });
                    break;
                default:
                    break;
            }
        }

  
        let matchesSearch = false;
        const cells = row.getElementsByTagName('td');
        for (let cell of cells) {
            if (cell.textContent.toLowerCase().includes(searchTerm)) {
                matchesSearch = true;
                break;
            }
        }
        if (matchesSearch && shouldDisplay) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });

    rowsArray.forEach(row => {
        tableBody.appendChild(row);
    });
}

    document.getElementById('searchButton').addEventListener('click', filterTable);
    searchInput.addEventListener('input', filterTable);
    sortFilter.addEventListener('change', filterTable);


    filterTable();
});