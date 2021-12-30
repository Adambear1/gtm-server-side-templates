// Enter your template code here.
const getRequestQueryParameters = require("getRequestQueryParameters");
const log = require("logToConsole");
const claimRequest = require("claimRequest");
const getRequestPath = require("getRequestPath");
const returnResponse = require("returnResponse");
const sha256Sync = require("sha256Sync");
const encodeUriComponent = require("encodeUriComponent");
const getRemoteAddress = require("getRemoteAddress");
const getRequestHeader = require("getRequestHeader");
const setPixelResponse = require("setPixelResponse");
const getCookieValues = require("getCookieValues");
const makeString = require("makeString");
const makeNumber = require("makeNumber");
const Math = require("Math");
const getTimestampMillis = require("getTimestampMillis");
const setCookie = require("setCookie");
const JSON = require("JSON");
const sendHttpRequest = require("sendHttpRequest");

const params = getRequestQueryParameters();
const refreshCookie = () => {
  const fbCookie = getCookieValues("_fbc")[0];
  if (fbCookie) {
    setCookie("_fbc", fbCookie, {
      domain: "auto",
      path: "/",
      "max-age": 60 * 60 * 24 * 30 * 3,
      samesite: "Lax",
      secure: true,
    });
  }
};
const getPostUrl = (params) => {
  return makeString(
    "https://graph.facebook.com/" +
      params.facebookapiVersions +
      "/" +
      params.facebookPixel +
      "/events?access_token=" +
      params.facebookConversionsApiToken
  );
};
const getPostBody = (params) => {
  var event = params.event;
  var status = event === "CompleteRegistration" ? true : false;
  var content_type = function(){
        event = params.event.toLowerCase();
        if(event === "donate" || event === "completeregistration" || event === "pageview"){
          return "";
        }
        if(event === "viewcontent" || event === "addtocart") return "product";
        if(params.quantity && makeNumber(params.quantity) > 1) return "product_group";
        if(params.products && params.products.length > 1) return "product_group";
        if(params.name && params.name.length > 1) return "product_group";
        if(event.toLowerCase() === "addtocart") return "product";
        return "product";
  };
  var content_ids = (params.id && params.id.length > 3) ? params.id : (params.ids || "");
  var body = {
    event_name: event,
    action_source: "website",
    event_time: Math.floor(getTimestampMillis() / 1000),
    event_id: params.event_id || "",
    event_source_url: params.source || "",
    user_data: {
      client_ip_address: getRemoteAddress(),
      client_user_agent: getRequestHeader("user-agent"),
      em: params.em || "",
      ph: params.ph || "",
      fn: params.fn || "",
      ln: params.ln || "",
      ct: params.ct || "",
      st: params.st || "",
      country: params.country || "",
      external_id: params.cid || "",
      fbc: getCookieValues("_fbc")[0],
      fbp: getCookieValues("_fbp")[0],
    },
    custom_data: {
      value: params.price || "0.00",
      currency: "USD",
      content_type: content_type(),
      content_name: params.products || params.name || params.category || "",
      order_id:
        params.event === "Purchase" ? params.event_id || "" : "",
      content_ids: [content_ids],
      num_items: params.quantity || "0",
    },
    opt_out: false,
  };
  if(status){
    body.status = status;
    return body;
  }
  return body;
};
if (getRequestPath().indexOf("/rhux.gif") === 0) {
  claimRequest();
  log(params);
  log(getPostUrl(params));
  log(getPostBody(params));
  const postBody =
    "data=" +
    encodeUriComponent(JSON.stringify([getPostBody(params)])) +
    (data.testId ? "&test_event_code=" + data.testId : "");
  sendHttpRequest(
    getPostUrl(params),
    (statusCode, headers, fbBody) => {
      if (statusCode !== 200) {
        log("FB", "Error from Facebook Conversions API: " + fbBody);
      } else {
        log(
          "FB",
          "Successful response from Facebook Conversions API: " + statusCode + " " + fbBody
        );
      }
    },
    {
      headers: { content_type: "application/x-www-form-urlencoded" },
      method: "POST",
      timeout: 5000,
    },
    postBody
  );
  refreshCookie();
  setPixelResponse();
  returnResponse();
}