import { Fragment } from "preact";
import { apiNs } from "./compat";

function getExtraMessage(name) {
  switch (name) {
    case "version":
      return apiNs.runtime.getManifest().version;
    default:
      return null;
  }
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
