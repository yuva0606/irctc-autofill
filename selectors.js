function getPassengerNameInput() {
    const passengerComponent = document.querySelector(
        '[formcontrolname="passengerName"]'
    );

    if (!passengerComponent) {
        return null;
    }

    return passengerComponent.querySelector('input');
}


function getPassengerAgeInput() {
    return document.querySelector(
        'input[formcontrolname="passengerAge"]'
    );
}


function getPassengerGenderSelect() {
    return document.querySelector(
        'select[formcontrolname="passengerGender"]'
    );
}


function getPassengerBerthSelect() {
    return document.querySelector(
        'select[formcontrolname="passengerBerthChoice"]'
    );
}


function getAddPassengerButton() {
    const spans = document.querySelectorAll("span.prenext");

    for (const span of spans) {
        if (span.textContent.includes("+ Add Passenger")) {
            return span.closest("a");
        }
    }

    return null;
}

function waitForElement(getElement, timeout = 10000) {
    return new Promise((resolve) => {

        const startTime = Date.now();

        const check = () => {

            const element = getElement();

            if (element) {
                resolve(element);
                return;
            }

            if (Date.now() - startTime >= timeout) {
                resolve(null);
                return;
            }

            setTimeout(check, 200);
        };

        check();
    });
}

function getPaymentOption(paymentMode) {
    return document.querySelector(
        `input[name="paymentType"][value="${paymentMode}"]`
    );
}


function getContinueButton() {
    const buttons = document.querySelectorAll(
        'button[type="submit"].train_Search'
    );

    for (const button of buttons) {
        if (button.textContent.trim() === "Continue") {
            return button;
        }
    }

    return null;
}