import { Fragment } from "preact";
import { apiNs } from "./compat";
import { escapeHtml } from "./misc";

function getExtraMessage(name) {
  switch (name) {
    case "version":
      return apiNs.runtime.getManifest().version;
    default:
      return null;
  }
}

export function renderTemplate(domTemplate) {
  const template = domTemplate.innerHTML;
  domTemplate.parentElement.innerHTML = template.replace(
    /{{__MSG_(\w+)__}}/g,
    function (match, key) {
      const content = getExtraMessage(key) || apiNs.i18n.getMessage(key);
      // escape html special chars except for keys that explicitly ends with 'html'
      return key.endsWith("html") ? content : escapeHtml(content);
    }
  );
}

export function T(key, substitutions) {
  return getExtraMessage(key) || apiNs.i18n.getMessage(key, substitutions);
}

export function TT(key, substitutions) {
  const content = T(key, substitutions);
  return key.endsWith("html") ? (
    <span dangerouslySetInnerHTML={{ __html: content }}></span>
  ) : (
    <Fragment>{content}</Fragment>
  );
}
