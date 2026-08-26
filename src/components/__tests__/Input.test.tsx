import { render } from "@testing-library/react-native";
import { Input } from "../Input";

describe("Input numeric", () => {
  it("asks for the matching keypad", () => {
    const { getByLabelText } = render(<Input label="Age" numeric="integer" value="" />);
    expect(getByLabelText("Age").props.keyboardType).toBe("number-pad");
  });

  it("asks for the separator keypad in decimal mode", () => {
    const { getByLabelText } = render(<Input label="Weight" numeric="decimal" value="" />);
    expect(getByLabelText("Weight").props.keyboardType).toBe("decimal-pad");
  });

  it("shows the error in place of the hint", () => {
    const { queryByText } = render(
      <Input
        label="Weight"
        numeric="decimal"
        value="qe"
        hint="How much do you weigh?"
        error="Enter a number, in kg"
      />
    );
    expect(queryByText("Enter a number, in kg")).not.toBeNull();
    expect(queryByText("How much do you weigh?")).toBeNull();
  });
});
