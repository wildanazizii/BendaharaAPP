let tokenClient;
let gapiInited = false;
let gisInited = false;

function showMessage(message, type) {
    const statusEl = document.getElementById("status");
    statusEl.classList.remove('d-none', 'alert-success', 'alert-danger', 'alert-info', 'alert-warning');
    statusEl.classList.add(`alert-${type}`);
    statusEl.innerText = message;
    statusEl.scrollIntoView({ behavior: 'smooth' });
}

function gapiLoaded() {
    gapi.load('client', initializeGapiClient);
}

async function initializeGapiClient() {
    await gapi.client.init({
        apiKey: CONFIG.API_KEY,
        discoveryDocs: [CONFIG.DISCOVERY_DOC],
    });
    gapiInited = true;
    maybeEnableButtons();
}

function gisLoaded() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CONFIG.CLIENT_ID,
        scope: CONFIG.SCOPES,
        callback: '', // defined later
    });
    gisInited = true;
    maybeEnableButtons();
}

function maybeEnableButtons() {
    if (gapiInited && gisInited) {
        document.getElementById('authorize_button').style.display = 'inline-block';
    }
}

function handleAuthClick() {
    tokenClient.callback = async (resp) => {
        if (resp.error !== undefined) {
            throw (resp);
        }
        document.getElementById('signout_button').style.display = 'inline-block';
        document.getElementById('authorize_button').style.display = 'none';
        document.getElementById('dataForm').style.display = 'block';
        showMessage('Login berhasil! Silakan masukkan data.', 'success');
    };

    if (gapi.client.getToken() === null) {
        tokenClient.requestAccessToken({prompt: 'consent'});
    } else {
        tokenClient.requestAccessToken({prompt: ''});
    }
}

function handleSignoutClick() {
    const token = gapi.client.getToken();
    if (token !== null) {
        google.accounts.oauth2.revoke(token.access_token);
        gapi.client.setToken('');
        document.getElementById('dataForm').style.display = 'none';
        document.getElementById('authorize_button').style.display = 'inline-block';
        document.getElementById('signout_button').style.display = 'none';
        showMessage('Berhasil logout', 'info');
    }
}

async function handleFormSubmit(e) {
    e.preventDefault();

    const month = document.getElementById("month").value;
    const name = document.getElementById("name").value;
    const syahriyah = document.getElementById("syahriyah").checked ? "75000" : "";
    const makan = document.getElementById("makan").checked ? "300000" : "";
    const parkir = document.getElementById("parkir").checked ? "30000" : "";
    const laptop = document.getElementById("laptop").checked ? "10000" : "";

    try {
        // Get the current row count
        const response = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: CONFIG.SPREADSHEET_ID,
            range: `${month}!A:A`
        });
        
        const startRow = 5;
        const currentRowCount = response.result.values?.length || 0;
        const nextNo = currentRowCount >= startRow ? currentRowCount - startRow + 1 : 1;

        // Append the data
        const result = await gapi.client.sheets.spreadsheets.values.append({
            spreadsheetId: CONFIG.SPREADSHEET_ID,
            range: `${month}!A:F`,
            valueInputOption: 'USER_ENTERED',
            insertDataOption: 'INSERT_ROWS',
            resource: {
                values: [[nextNo, name, syahriyah, makan, parkir, laptop]]
            }
        });

        showMessage('Data berhasil ditambahkan ke sheet ' + month + '!', 'success');
        document.getElementById("dataForm").reset();
        document.getElementById("total").value = "";
        $('#name').val('').trigger('change'); // Reset Select2
    } catch (err) {
        console.error('Error:', err);
        if (err.result?.error?.status === 'INVALID_ARGUMENT' && 
            err.result?.error?.message?.includes('Unable to parse range')) {
            showMessage(`Sheet ${month} belum ada. Silakan hubungi admin untuk membuat sheet bulanan.`, 'warning');
        } else {
            let errorMessage = 'Gagal menyimpan data: ';
            if (err.result?.error?.message) {
                errorMessage += err.result.error.message;
            } else if (err.message) {
                errorMessage += err.message;
            } else {
                errorMessage += 'Unknown error';
            }
            showMessage(errorMessage, 'danger');
        }
    }
}

function calculateTotal() {
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    let total = 0;
    checkboxes.forEach(checkbox => {
        if (checkbox.checked) {
            total += parseInt(checkbox.value);
        }
    });
    document.getElementById("total").value = `Rp ${total.toLocaleString('id-ID')}`;
}

// Initialize when document is ready
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Select2
    $('#name').select2({
        placeholder: "Pilih Nama...",
        allowClear: true
    });

    // Add form submit handler
    document.getElementById("dataForm").addEventListener("submit", handleFormSubmit);

    // Add checkbox change handlers
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', calculateTotal);
    });
});
