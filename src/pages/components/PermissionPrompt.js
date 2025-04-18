import { apiNs } from "../../utils/compat";
import { PropTypes } from "prop-types";
import { T, TT } from "../../utils/i18n";

export default function PermissionPrompt({ type }) {
  const permissionName =
    type === "camera"
      ? T("grant_camera_permission_name")
      : type === "all-urls"
      ? T("grant_all_urls_permission_name")
      : null;
  return (
    <div class="instructions instruction-screen" id="permissionInstructions">
      <p>
        <span id="grant-permissions-instructions">
          {TT("grant_permissions_instructions_html", permissionName)}
        </span>
        <br />
        <br />
        <a
          class="clickable"
          id="grantPermissionsBtn"
          target="_blank"
          rel="noreferrer"
          href={apiNs.runtime.getURL(`/pages/grant.html?permission=${type}`)}
        >
          <img class="icon icon-invert" src="../icons/open-url.svg" />
          {TT("grant_permissions_btn")}
        </a>
      </p>
    </div>
  );
}

PermissionPrompt.propTypes = {
  type: PropTypes.string,
};
