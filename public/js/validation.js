function isNumberKey(evt, isdotallowed = true) {
    var charCode = (evt.which) ? evt.which : event.keyCode
    if (charCode > 31 && (charCode < 48 || charCode > 57)) {
        if (charCode == 46 && isdotallowed) {
            return true;
        } else {
            return false;
        }
    }
    return true;
}

function isNumberKeyDecimal(evt, value = null) {
    var charCode = (evt.which) ? evt.which : event.keyCode
    if (charCode > 31 && (charCode < 48 || charCode > 57)) {
        if (value.length != 0 && !value.toString().includes(".") && charCode == 46) {
            return true;
        } else {
            return false;
        }
    }
    return true;
}

function alphaNumSpace(e) {
    var keyCode = e.keyCode || e.which;
    var pattern = /^[@.a-z\d\-_\s]+$/i;
    var isValid = pattern.test(String.fromCharCode(keyCode));
    return isValid;
}

function alphaSpace(e) {
    var keyCode = e.keyCode || e.which;
    var pattern = /^[a-zA-Z ]*$/;
    var isValid = pattern.test(String.fromCharCode(keyCode));
    return isValid;
}

function trimSpace(e) {
    e.target.value = e.target.value.trim()
}