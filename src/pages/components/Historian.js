import { useEffect, useState } from "react";
import { PropTypes } from "prop-types";

import { T, TT } from "../../utils/i18n";
import { removeHistory, getHistory, clearHistory } from "../../utils/history";
import { useSettingsContext } from "../../utils/hooks";

export default function Historian(props) {
  const [history, setHistory] = useState([]);
  const { settings, saveSettings } = useSettingsContext();

  const getData = () => {
    getHistory()
      .then(function (fetchedHistory) {
        fetchedHistory.reverse();
        setHistory(fetchedHistory);
      })
      .catch((error) => console.error("Failed to fetch history:", error));
  };

  useEffect(() => {
    getData();
  }, []);

  const historyList = history.map((item) => {
    return (
      <li
        class="history-item"
        title={item.text || ""}
        key={item.text}
        onClick={() => {
          if (props.onClickItem) {
            props.onClickItem(item);
          }
        }}
      >
        <img
          class="icon icon-invert"
          src={
            item.type === "decode"
              ? "../icons/scan.svg"
              : "../icons/generate.svg"
          }
        />
        <span class="history-item-text">{item.text || ""}</span>
        <span
          class="remove-history-btn clickable"
          title={T("remove_history_btn_title")}
          onClick={(e) => {
            e.stopPropagation();
            removeHistory(item.text)
              .then(() => {
                // Optimistically update the local state
                setHistory((prevHistory) =>
                  prevHistory.filter((h) => h.text !== item.text)
                );
              })
              .catch((error) =>
                console.error("Failed to remove history item:", error)
              );
          }}
        >
          <img class="icon icon-invert" src="../icons/trash.svg" />
        </span>
      </li>
    );
  });

  return (
    <div class="history" id="history">
      <ul class="history-items" id="history-items">
        {historyList}
      </ul>
      <div class="footer-container">
        <div class="footer actions1">
          <span
            class="clickable"
            id="clear-history-btn"
            title={T("clear_history_btn_title")}
            onClick={() => {
              clearHistory()
                .then(() => {
                  // Optimistically update the local state
                  setHistory([]);
                })
                .catch((error) =>
                  console.error("Failed to clear history:", error)
                );
            }}
          >
            <img class="icon icon-invert" src="../icons/swipe.svg" />
            {TT("clear_history_btn")}
          </span>
        </div>
        <div class="footer actions2"></div>
        <div class="footer actions3">
          {settings.historyEnabled ? (
            <a
              class="clickable"
              id="disable-history-btn"
              title={T("disable_history_btn_title")}
              onClick={() => {
                saveSettings({ historyEnabled: false });
              }}
            >
              <img class="icon icon-invert" src="../icons/pause.svg" />
              {TT("disable_history_btn_label")}
            </a>
          ) : (
            <a
              class="clickable"
              id="enable-history-btn"
              title={T("enable_history_btn_title")}
              onClick={() => {
                saveSettings({ historyEnabled: true });
              }}
            >
              <img class="icon icon-invert" src="../icons/play.svg" />
              {TT("enable_history_btn_label")}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

Historian.propTypes = {
  onClickItem: PropTypes.func,
};
