import { Fragment } from "preact";
import { apiNs } from "./compat";
import { escapeHtml } from "./misc";

export function renderTemplate(domTemplate) {
  const template = domTemplate.innerHTML;
  const messages = { version: apiNs.runtime.getManifest().version };
  domTemplate.parentElement.innerHTML = template.replace(
    /{{__MSG_(\w+)__}}/g,
    function (match, key) {
      const content = messages[key] || apiNs.i18n.getMessage(key);
      // escape html special chars except for keys that explicitly ends with 'html'
      return key.endsWith("html") ? content : escapeHtml(content);
    }
  );
}

export function TT(key) {
  const content = apiNs.i18n.getMessage(key);
  return key.endsWith("html") ? (
    <span dangerouslySetInnerHTML={{ __html: content }}></span>
  ) : (
    <Fragment>{content}</Fragment>
  );
}
