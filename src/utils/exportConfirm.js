export const confirmUnencryptedExport = () =>
    window.confirm(
        'The exported file will NOT be encrypted and will contain patient information. ' +
        'Save it only to a secure location. Continue?'
    )
