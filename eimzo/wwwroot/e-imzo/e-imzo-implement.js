const client = window.EIMZOClient;
const CAPIWS = window.CAPIWS;
let _loadedKey = '';
var certsList = [];

const apiKeys = [
    'localhost', '96D0C1491615C82B9A54D9989779DF825B690748224C2B04F500F370D51827CE2644D8D4A82C18184D73AB8530BB8ED537269603F61DB0D03D2104ABF789970B',
    '127.0.0.1', 'A7BCFA5D490B351BE0754130DF03A068F855DB4333D43921125B9CF2670EF6A40370C646B90401955E1F7BC9CDBF59CE0B2C5467D820BE189C845D0B79CFC96F'
];

async function checkVersion() {
    return new Promise((resolve, reject) => {
        client.checkVersion(resolve, reject);
    });
}

async function isIDCardPlugged() {
    return new Promise((resolve, reject) => {
        client.idCardIsPLuggedIn(resolve, reject);
    });
}

async function installApiKeys() {
    return new Promise((resolve, reject) => {
        client.installApiKeys(resolve, reject);
    });
}

async function listAllUserKeys() {
    return new Promise((resolve, reject) => {
        client.listAllUserKeys(
            (cert, index) => `cert-${cert.serialNumber}-${index}`,
            (index, cert) => cert,
            resolve,
            reject
        );
    });
}

async function loadKey(cert) {
    return new Promise((resolve, reject) => {
        client.loadKey(cert, (id) => {
            _loadedKey = cert;
            resolve({ cert, id });
        }, reject);
    });
}

async function getCertificateChain(loadKeyId) {
    return new Promise((resolve, reject) => {
        CAPIWS.callFunction({
            plugin: 'x509',
            name: 'get_certificate_chain',
            arguments: [loadKeyId]
        }, (event, data) => {
            data.success ? resolve(data.certificates) : reject('Failed');
        }, reject);
    });
}

async function getMainCertificate(loadKeyId) {
    const result = await getCertificateChain(loadKeyId);
    return Array.isArray(result) && result.length > 0 ? result[0] : null;
}

async function getCertInfo(cert) {
    return new Promise((resolve, reject) => {
        CAPIWS.callFunction({
            name: 'get_certificate_info',
            arguments: [cert]
        }, (event, data) => {
            data.success ? resolve(data.certificate_info) : reject('Failed');
        }, reject);
    });
}

async function signPkcs7(cert, content) {
    const keyId = cert === 'idcard' ? 'idcard' : (await loadKey(cert))?.id;
    return new Promise((resolve, reject) => {
        CAPIWS.callFunction({
            name: 'create_pkcs7',
            plugin: 'pkcs7',
            arguments: [window.Base64.encode(content), keyId, 'no']
        }, (event, data) => {
            data.success ? resolve(data) : reject('Failed');
        }, reject);
    });
}

async function createPkcs7(id, content, timestamper, enableAttachTimestamp) {
    return new Promise((resolve, reject) => {
        client.createPkcs7(id, content, timestamper, resolve, reject, false, false, enableAttachTimestamp);
    });
}

async function getTimestampToken(signature) {
    return new Promise((resolve, reject) => {
        CAPIWS.callFunction({
            name: 'get_timestamp_token_request_for_signature',
            arguments: [signature]
        }, (event, data) => {
            data.success ? resolve(data.timestamp_request_64) : reject('Failed');
        }, reject);
    });
}

function addApiKey(domain, key) {
    if (!apiKeys.includes(domain)) {
        apiKeys.push(domain, key);
    }
}

async function install() {
    await checkVersion();
    client.API_KEYS = apiKeys;
    await installApiKeys();
}

async function signWithKey(key) {
    let loadKeyResult = await loadKey(key)
    let cert = await getMainCertificate(loadKeyResult.id)
    let certInfo = await getCertInfo(cert)

    let result = await signPkcs7(key, 'Hello world')
    let token = await getTimestampToken(result.signature_hex)

    console.log(result, token)
}

function keyType_changed() {
    const pfxSelected = document.getElementById("pfx").checked;
    const selectElement = document.getElementById("selectS");
    const pluggedLabel = document.getElementById("plugged");

    if (pfxSelected) {
        // Enable PFX dropdown and disable ID-card message
        selectElement.disabled = false;
        pluggedLabel.style.color = "gray";
        pluggedLabel.textContent = "не подключена";
    } else {
        // Disable PFX dropdown and enable ID-card message
        selectElement.disabled = true;
        pluggedLabel.style.color = "red";
        pluggedLabel.textContent = "ID-card не подключена";
    }
}

// Function to handle changes in the select dropdown
function cbChanged(selectElement) {
    const selectedKey = selectElement.value;

    if (selectedKey) {
        document.getElementById("stir").value = selectedKey;
    }
    else {
        window.showErrorSnackbar("Select a key from the list.");
    }
}

// Function to handle sign-in
window.signinImzo = async function () {
    const key = document.getElementById("stir").value;
    var cert = certsList.filter(x => (x.TIN == key || x.PINFL == key) &&
                                     key && key.length > 0)[0];
    if (cert) {
        let result = await signPkcs7(cert, 'Hello World!')
        let token = await getTimestampToken(result.signature_hex)
        var data =
        {
            result,
            token
        };

        var json = JSON.stringify(data);
        console.log(json)
        return json;
    }
    return '';
}

// Populate the select dropdown with user keys
function fillSelect(certs) {
    const selectElement = document.getElementById("selectS");

    if (certs.length === 0) {
        const option = document.createElement("option");
        option.value = "";
        option.textContent = "No keys available";
        selectElement.appendChild(option);
    } else {
        certs.forEach(cert => {
            const option = document.createElement("option");
            option.value = cert.TIN.length < 1 ? cert.PINFL : cert.TIN;
            option.textContent = cert.CN;
            selectElement.appendChild(option);
        });
    }
}

async function loadapp() {
    try {
        await install(); // Install API keys

        certsList = await listAllUserKeys();
        fillSelect(certsList);
    } catch (error) {
        console.error("Error during EIMZO operations:", error);
        if (error && error.message) {
            console.error("Error message:", error.message);
        } else {
            console.error("No detailed error message provided.");
        }
    }
};