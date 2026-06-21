import Svg, { Path } from "react-native-svg";

export interface ThrivoMarkProps {
  size?: number;
}

export function ThrivoMark({ size = 64 }: ThrivoMarkProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      accessibilityRole="image"
      accessibilityLabel="Thrivo"
    >
      <Path
        d="M24.1094 0C32.8249 0 39.8902 7.06532 39.8902 15.7808V56.1096C39.8902 60.4674 36.3575 64 31.9998 64C27.642 64 24.1094 60.4674 24.1094 56.1096V0Z"
        fill="#09823C"
      />
      <Path
        d="M15.7808 15.7808C7.06532 15.7808 -3.08835e-7 8.71545 -6.89802e-7 -6.10352e-5L24.1096 -6.2089e-5C32.8251 -6.247e-5 39.8904 7.06525 39.8904 15.7808L15.7808 15.7808Z"
        fill="#09823C"
      />
      <Path
        d="M39.8902 6.89802e-7C31.1747 3.08835e-7 24.1094 7.06532 24.1094 15.7808L48.219 15.7808C56.9345 15.7808 63.9998 8.71551 63.9998 1.74367e-6L39.8902 6.89802e-7Z"
        fill="#F39C12"
      />
    </Svg>
  );
}
