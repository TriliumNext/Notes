import "../stylesheets/bootstrap.scss";

// @ts-ignore - module = undefined
// Required for correct loading of scripts in Electron
if (typeof module === 'object') {window.module = module; module = undefined;}

const device = getDeviceType()
console.log("Setting device cookie to:", device);
setCookie("trilium-device", device);

function setCookie(name: string, value?: string) {
    const date = new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000);
    const expires = "; expires=" + date.toUTCString();

    document.cookie = name + "=" + (value || "")  + expires + "; path=/";
}

function getDeviceType() {
    if (window.location.search === '?desktop') return "desktop";
    if (window.location.search === '?mobile') return "mobile";
    return isMobile() ? "mobile" : "desktop";
}

// https://stackoverflow.com/a/73731646/944162
function isMobile() {
    const mQ = matchMedia?.('(pointer:coarse)');
    if (mQ?.media === '(pointer:coarse)') return !!mQ.matches;

    if ('orientation' in window) return true;
    const userAgentsRegEx = /\b(Android|iPhone|iPad|iPod|Windows Phone|BlackBerry|webOS|IEMobile)\b/i
    return userAgentsRegEx.test(navigator.userAgent)
}