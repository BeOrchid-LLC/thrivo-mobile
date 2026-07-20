/* global jest */
const React = require("react");

function Passthrough({ children }) {
  return React.createElement(React.Fragment, null, children);
}

const BottomSheetModal = React.forwardRef(function BottomSheetModal({ children }, ref) {
  React.useImperativeHandle(ref, () => ({
    present: jest.fn(),
    dismiss: jest.fn(),
  }));
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
