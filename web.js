const log = require("logToConsole");
const copyFromDataLayer = require("copyFromDataLayer");
const encodeUriComponent = require("encodeUriComponent");
const makeInteger = require("makeInteger");
const makeString = require("makeString");
const sendPixel = require("sendPixel");
const getUrl = require("getUrl");

let ecommerce = copyFromDataLayer("ecommerce");
let dlEvent = copyFromDataLayer("event");
const getEvent = () => {
      var events = ["add", "purchase", "detail", "CheckoutStep1", "CheckoutStep2", "CheckoutStep3"];
      if(data.completeRegistration && dlEvent === "trackEvent") return "CompleteRegistration";
      if (events.indexOf(dlEvent) > 0) return dlEvent;
      var ecomEvent = ecommerce && events.filter(e => ecommerce[e]);
      if (ecomEvent && ecomEvent.length > 0) return ecomEvent[0];
};
const event = getEvent() || "PageView";
const setScope = () => {
    let scope = [];
    const _default = true;
    if (data.facebook || _default) scope.push("facebook");
    if (data.amazon) scope.push("amazon");
    let str = [];
    const fixedKeys = ["ConversionsApiToken", "Pixel", "apiVersions"];
    for (const type of scope) {
        fixedKeys.map((key) => {
            let arg = type + key;
            if (type) {
                str.push(
                    encodeUriComponent(makeString(arg)) +
                    "=" +
                    encodeUriComponent(makeString(data[arg]))
                );
            }
        });
    }
    return str.join("&");
};
const setEvent = () => {
    log("Event is ", event);
    switch (event) {
        case "purchase": //Purchase
            return [
                "price",
                "quantity",
                "name",
                "category",
                "ids",
                "id",
            ];
        case "add": //AddToCart
            return [
                "price",
                "quantity",
                "category",
                "name",
                "id"
            ];
        case "detail": // ViewContent
            return [
                "price",
                "quantity",
                "category",
                "name",
                "id"
            ];
        case "CheckoutStep1": // InitiateCheckout
            return [
                "price",
                "category",
                "quantity",
                "name",
                "ids"
            ];
        case "CheckoutStep2": // AddShippingInfo
            return [
                "price",
                "quantity",
                "category",
                "name",
                "id"
            ];
        case "CheckoutStep3": // AddPaymentInfo
            return [
                "price",
                "quantity",
                "category",
                "name",
                "id"
            ];
        default:
            return [];
    }
};
const ga4EventsToFacebookEvents = {
    PageView: "PageView",
    add: "AddToCart",
    purchase: "Purchase",
    detail: "ViewContent",
    CheckoutStep1: "InitiateCheckout",
    CheckoutStep2: "AddShippingInfo",
    CheckoutStep3: "AddPaymentInfo",
    CompleteRegistration: "CompleteRegistration"
};
const setData = () => {
    var productArr = (scope) => {
        if (scope === "CheckoutStep1" || scope === "CheckoutStep2" || scope === "CheckoutStep3") return ecommerce.checkout.products;
        return ecommerce[scope].products.length > 0 && ecommerce[scope].products;
    };
    const getTotal = (type, scope) => {
        let sum = 0;
        if (productArr(scope)) {
            productArr(scope).map(item => {
                sum += (makeInteger(item[type]) || 1);
            });
            return encodeUriComponent(makeString(sum));
        }
        return encodeUriComponent("No Data Provided");
    };
    const getArray = (type, scope) => {
        let arr = [];
        if (productArr(scope)) {
            productArr(scope).map(item => {
                arr.push(item[type]) || arr.push(item.variant);
            });
            return encodeUriComponent(makeString(arr));
        }
        return encodeUriComponent("No Data Provided");
    };
    let _data = {
        event: () => ga4EventsToFacebookEvents[event],
    };
    let array = setEvent();
    if (array.length < 1) return _data;
    const scope = event;
    array.map((category) => {
        const fn = function () {
            if (category === "price" || category === "quantity") {
                return getTotal(category, scope);
            }
            if (category === "name" || category === "category" || category === "id" || category === "ids") {
                return getArray(category, scope);
            }
            return null;
        };
        if (fn() === null || fn() === undefined) return;
        else {
            _data[category] = fn;
        }
    });
    return _data;

};
const event_id = event === "purchase" && ecommerce.purchase.actionField.id;
const setUrl = () => {
    const _data = setData();
    let url =
        data.server +
        "/rhux.gif&?" +
        setScope() +
        "&source=" +
        encodeUriComponent(getUrl()) +
        "&event_id=" + encodeUriComponent(event_id) +
        "&";
    for (let item in _data) {
        if (_data[item]()) {
            log(item, " ", makeString(_data[item]()));
            url += item + "=" + _data[item]() + "&";
        }
    }
    return url;
};
log(setUrl());
sendPixel(
    setUrl(),
    function () {
        data.gtmOnSuccess();
    },
    function () {
        data.gtmOnFailure();
    }
);