chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {

    if (message.type !== "AUTOFILL_NOW") {
        return;
    }

    const passengers = message.passengers;

    console.log("Passengers received:", passengers);

    const rowsReady = await addPassengerRows(passengers.length);

    if (!rowsReady) {
        console.log("Could not create all passenger rows");
        return;
    }

    const nameComponents = document.querySelectorAll(
        '[formcontrolname="passengerName"]'
    );

    const nameInputs = Array.from(nameComponents).map(component =>
        component.querySelector("input")
    );

    const ageInputs = document.querySelectorAll(
        'input[formcontrolname="passengerAge"]'
    );

    const genderSelects = document.querySelectorAll(
        'select[formcontrolname="passengerGender"]'
    );

    const berthSelects = document.querySelectorAll(
        'select[formcontrolname="passengerBerthChoice"]'
    );

    for (let index = 0; index < passengers.length; index++) {

        const passenger = passengers[index];

        if (index >= nameInputs.length) {
            console.log(
                `No IRCTC row available for passenger ${index + 1}`
            );
            return;
        }

        console.log(
            `Filling passenger ${index + 1}`
        );


        // Name
        const nameInput = nameInputs[index];

        if (nameInput) {
            nameInput.value = passenger.name;

            nameInput.dispatchEvent(
                new Event("input", { bubbles: true })
            );

            nameInput.dispatchEvent(
                new Event("change", { bubbles: true })
            );

            nameInput.dispatchEvent(
                new Event("blur", { bubbles: true })
            );
        }


        // Age
        const ageInput = ageInputs[index];

        if (ageInput) {
            ageInput.value = passenger.age;

            ageInput.dispatchEvent(
                new Event("input", { bubbles: true })
            );

            ageInput.dispatchEvent(
                new Event("change", { bubbles: true })
            );
        }


        // Gender
        const genderSelect = genderSelects[index];

        if (genderSelect) {
            genderSelect.value = passenger.gender;

            genderSelect.dispatchEvent(
                new Event("change", { bubbles: true })
            );
        }


        // Berth
        const berthSelect = berthSelects[index];

        if (berthSelect) {
            berthSelect.value = passenger.berth;

            berthSelect.dispatchEvent(
                new Event("change", { bubbles: true })
            );
        }

    }

    console.log("Autofill completed");

    const paymentMode = message.paymentMode;

    const paymentOption = await waitForElement(
        () => getPaymentOption(paymentMode)
    );

    if (!paymentOption) {
        console.log("Payment option not found");
        return;
    }

    paymentOption.click();

    console.log(
        "Payment mode selected:",
        paymentMode
    );

    await delay(500);

    const continueButton = await waitForElement(
        getContinueButton
    );

    if (!continueButton) {
        console.log("Continue button not found");
        return;
    }

    continueButton.click();

    console.log("Continue button clicked");
});

async function addPassengerRows(requiredCount) {

    while (
        document.querySelectorAll(
            '[formcontrolname="passengerAge"]'
        ).length < requiredCount
    ) {

        const addButton = await waitForElement(
            getAddPassengerButton
        );

        if (!addButton) {
            console.log("Add Passenger button not found");
            return false;
        }

        console.log("Adding passenger row");

        addButton.click();

        // Wait for Angular to create the new row
        await new Promise(resolve => setTimeout(resolve, 300));
    }

    return true;
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}