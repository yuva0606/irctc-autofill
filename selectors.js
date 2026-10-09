const IRCTC_SELECTORS = {
    passengerNameComponent: '[formcontrolname="passengerName"]',
    passengerAge: 'input[formcontrolname="passengerAge"]',
    passengerGender: 'select[formcontrolname="passengerGender"]',
    passengerBerth: 'select[formcontrolname="passengerBerthChoice"]',
    contactNumber: [
        'input[formcontrolname="mobileNumber"]',
        'input#mobileNumber[name="mobileNumber"]'
    ],
    confirmedBerths: [
        'input[formcontrolname="bookOnlyIfCnf"]',
        'input#confirmberths[name="confirmberths"]'
    ],
    preferredCoach: [
        'input[formcontrolname="coachId"]',
        'input[placeholder="Preferred Coach No."]'
    ],
    payment: mode => `input[name="paymentType"][value="${mode}"]`
};

function getUniqueElement(selectors, expectedType) {
    for (const selector of selectors) {
        const candidates = Array.from(document.querySelectorAll(selector))
            .filter(element => !expectedType || element.matches(expectedType));

        if (candidates.length === 1) {
            return { status: "found", element: candidates[0], selector };
        }

        if (candidates.length > 1) {
            return { status: "ambiguous", selector };
        }
    }

    return { status: "missing" };
}

function getPassengerFields() {
    const nameComponents = Array.from(document.querySelectorAll(
        IRCTC_SELECTORS.passengerNameComponent
    ));
    const nameInputs = nameComponents.map(component => {
        const inputs = Array.from(component.querySelectorAll('input[type="text"]'));
        return inputs.length === 1 ? inputs[0] : null;
    });
    const fields = {
        nameInputs,
        ageInputs: Array.from(document.querySelectorAll(IRCTC_SELECTORS.passengerAge)),
        genderSelects: Array.from(document.querySelectorAll(IRCTC_SELECTORS.passengerGender)),
        berthSelects: Array.from(document.querySelectorAll(IRCTC_SELECTORS.passengerBerth))
    };
    const counts = [
        fields.nameInputs.length,
        fields.ageInputs.length,
        fields.genderSelects.length,
        fields.berthSelects.length
    ];

    if (!counts[0]) {
        return { status: "missing", field: "passenger rows" };
    }

    if (nameInputs.includes(null) || new Set(counts).size !== 1) {
        return { status: "ambiguous", field: "passenger row fields" };
    }

    return { status: "found", fields, count: counts[0] };
}

function getAddPassengerButton() {
    const candidates = Array.from(document.querySelectorAll("span.prenext"))
        .filter(span => span.textContent.includes("+ Add Passenger"))
        .map(span => span.closest("a"))
        .filter(Boolean);
    return candidates.length === 1
        ? { status: "found", element: candidates[0] }
        : { status: candidates.length ? "ambiguous" : "missing" };
}

function waitForCondition(check, timeout = 10000) {
    return new Promise(resolve => {
        const startedAt = Date.now();
        const poll = () => {
            const result = check();
            if (result) {
                resolve(result);
                return;
            }
            if (Date.now() - startedAt >= timeout) {
                resolve(null);
                return;
            }
            setTimeout(poll, 200);
        };
        poll();
    });
}

function getPaymentOption(paymentMode) {
    return getUniqueElement([IRCTC_SELECTORS.payment(paymentMode)], 'input[type="radio"]');
}

function getContactNumberInput() {
    return getUniqueElement(IRCTC_SELECTORS.contactNumber, 'input[type="text"]');
}

function getBookOnlyIfConfirmedCheckbox() {
    return getUniqueElement(IRCTC_SELECTORS.confirmedBerths, 'input[type="checkbox"]');
}

function getPreferredCoachInput() {
    return getUniqueElement(IRCTC_SELECTORS.preferredCoach, 'input[type="text"]');
}
