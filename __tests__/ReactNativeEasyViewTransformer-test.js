import "react-native";
import React from "react";
import ViewTransformer from "../src";

// Note: test renderer must be required after react-native.
import renderer from "react-test-renderer";

it("React Native Easy View Transformer renders correctly", () => {
    renderer.create(<ViewTransformer />);
});
