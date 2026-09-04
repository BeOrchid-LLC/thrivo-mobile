/* global jest */
const React = require("react");

function Passthrough({ children }) {
  return React.createElement(React.Fragment, null, children);
}

// `dismiss()` fires `onDismiss` the way the real modal does once it has
// finished closing — the shell keeps itself mounted until that lands, so a mock
// that swallowed the call would leave every sheet on screen forever.
const BottomSheetModal = React.forwardRef(function BottomSheetModal({ children, onDismiss }, ref) {
  const onDismissRef = React.useRef(onDismiss);
  onDismissRef.current = onDismiss;
  React.useImperativeHandle(ref, () => ({
    present: jest.fn(),
    dismiss: jest.fn(() => onDismissRef.current?.()),
  }), []);
  return React.createElement(React.Fragment, null, children);
});

module.exports = {
  __esModule: true,
  BottomSheetModalProvider: Passthrough,
  BottomSheetBackdrop: () => null,
  BottomSheetView: Passthrough,
  BottomSheetScrollView: Passthrough,
  BottomSheetModal,
};
