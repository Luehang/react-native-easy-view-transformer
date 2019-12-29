"use strict";

import React, { Component } from "react";
import {
    Dimensions,
    Platform,
    StyleSheet,
    View,
    Image,
    Text,
    TouchableWithoutFeedback,
    Linking
} from "react-native";
import ViewTransformer from "react-native-easy-view-transformer";
import MasonryList from "react-native-masonry-list";

const deviceHeight = Dimensions.get("window").height;
const deviceWidth = Dimensions.get("window").width;
const platform = Platform.OS;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#368FFA"
    },
    header: {
        height: isIPhoneX() ? 74 : 64,
        backgroundColor: "transparent"
    },
    headerBody: {
        flex: 1,
        alignItems: "center",
    },
    mobileHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingTop: isIPhoneX() ? 30 : platform === "ios" ? 20 : 0
    },
    title: {
        fontSize: 25
    },
    listTab: {
        height: 32,
        flexDirection: "row",
        borderTopLeftRadius: 7.5,
        borderTopRightRadius: 7.5,
        backgroundColor: "#fff",
        marginBottom: -5
    },
    tab: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center"
    },
    tabTextUnderline: {
        borderBottomWidth: 2,
        borderBottomColor: "#e53935"
    },
    tabTextOn: {
        fontSize: 10,
        color: "#e53935"
    },
    tabTextOff: {
        fontSize: 10,
        color: "grey"
    }
});

function isIPhoneX() {
    const X_WIDTH = 375;
    const X_HEIGHT = 812;
    return (
        Platform.OS === "ios" &&
        ((deviceHeight === X_HEIGHT && deviceWidth === X_WIDTH) ||
        (deviceHeight === X_WIDTH && deviceWidth === X_HEIGHT))
    );
}

export default class ReactNativeEasyViewTransformerExample extends Component {
    render() {
        return (
            <View
                style={styles.container}
            >
                <View style={[styles.header, styles.mobileHeader]}>
                    <Image
                        source={{ uri: "https://luehangs.site/images/lue-hang2018-square.jpg" }}
                        style={{height: 35, width: 35, marginLeft: 10, borderRadius: 20}} />
                    <View style={styles.headerBody}>
                        <Text style={styles.title}>EasyViewTransformer</Text>
                    </View>
                </View>
                <View style={styles.listTab}>
                    <TouchableWithoutFeedback
                        style={{borderTopLeftRadius: 7.5,}}
                        onPress={() => Linking.openURL("https://luehangs.site")}>
                            <View style={styles.tab}>
                                <View style={[styles.tabTextUnderline, {paddingBottom: 3}]}>
                                    <Text style={styles.tabTextOn}>REMOTE/LOCAL</Text>
                                </View>
                            </View>
                    </TouchableWithoutFeedback>
                    <TouchableWithoutFeedback
                        style={{borderTopLeftRadius: 7.5,}}
                        onPress={() => Linking.openURL("https://luehangs.site")}>
                        <View style={styles.tab}>
                            <View style={{paddingBottom: 3}}>
                                <Text style={styles.tabTextOff}>CAMERA ROLL</Text>
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
                <ViewTransformer
                    maxScale={2}>
                    <MasonryList
                        images={[
                            { uri: "https://luehangs.site/pic-chat-app-images/pexels-photo-853168.jpeg" },
                            { uri: "https://luehangs.site/pic-chat-app-images/animals-avian-beach-760984.jpg",
                                dimensions: { width: 1080, height: 1920 } },
                            { url: "https://luehangs.site/pic-chat-app-images/beautiful-beautiful-woman-beauty-9763.jpg" },
                            { uri: "https://luehangs.site/pic-chat-app-images/photo-755745.jpeg" },
                            { uri: "https://luehangs.site/pic-chat-app-images/photo-799443.jpeg" }
                        ]}
                    />
                </ViewTransformer>
            </View>
        );
    }
}
