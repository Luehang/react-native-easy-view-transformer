import React from "react";
import {
    View, Animated, Easing, NativeModules, findNodeHandle
} from "react-native";
import Scrolling from "react-native-scrolling";
import PropTypes from "prop-types";
import { createResponder } from "react-native-easy-guesture-responder";
import {
    Rect, Transform, transformedRect, availableTranslateSpace,
    fitCenterRect, alignedRect, getTransform
} from "./TransformUtils";

export default class ViewTransformer extends React.Component {
    static Rect = Rect;
    static getTransform = getTransform;

    static propTypes = {
        enableTransform: PropTypes.bool,
        enableScale: PropTypes.bool,
        enableTranslate: PropTypes.bool,
        maxOverScrollDistance: PropTypes.number,
        maxScale: PropTypes.number,
        contentAspectRatio: PropTypes.number,
        enableResistance: PropTypes.bool,
        resistantStrHorizontal: PropTypes.oneOfType([
            PropTypes.func,
            PropTypes.number,
            PropTypes.string
        ]),
        resistantStrVertical: PropTypes.oneOfType([
            PropTypes.func,
            PropTypes.number,
            PropTypes.string
        ]),
        onTransformStart: PropTypes.func,
        onViewTransformed: PropTypes.func,
        onPinchTransforming: PropTypes.func,
        onPinchStartReached: PropTypes.func,
        onPinchEndReached: PropTypes.func,
        onTransformGestureReleased: PropTypes.func,
        onSwipeUpReleased: PropTypes.func,
        onSwipeDownReleased: PropTypes.func,
        onDoubleTapStartReached: PropTypes.func,
        onDoubleTapEndReached: PropTypes.func,
        onDoubleTapConfirmed: PropTypes.func,
        onSingleTapConfirmed: PropTypes.func,
        onLayout: PropTypes.func,
        children: PropTypes.node,
    };

    static defaultProps = {
        maxOverScrollDistance: 20,
        enableScale: true,
        enableTranslate: true,
        enableTransform: true,
        maxScale: 1,
        enableResistance: false,
        resistantStrHorizontal: (dx) => (dx /= 3),
        resistantStrVertical: (dy) => (dy /= 3)
    };

    constructor (props) {
        super(props);
        this.state = {
            // transform state
            scale: 1,
            translateX: 0,
            translateY: 0,
            // animation state
            animator: new Animated.Value(0),
            // layout
            width: 0,
            height: 0,
            pageX: 0,
            pageY: 0
        };
        this._viewPortRect = new Rect(); // A holder to avoid new too much

        this.onLayout = this.onLayout.bind(this);
        this.cancelAnimation = this.cancelAnimation.bind(this);
        this.contentRect = this.contentRect.bind(this);
        this.transformedContentRect = this.transformedContentRect.bind(this);
        this.animate = this.animate.bind(this);
        this.onResponderGrant = this.onResponderGrant.bind(this);
        this.onResponderRelease = this.onResponderRelease.bind(this);
        this.onResponderMove = this.onResponderMove.bind(this);

        this.scroller = new Scrolling(true, (dx, dy, scroller) => {
            if (dx === 0 && dy === 0 && scroller.isFinished()) {
                this.animateBounce();
                return;
            }

            this.updateTransform({
                translateX: this.state.translateX + dx / this.state.scale,
                translateY: this.state.translateY + dy / this.state.scale
            });
        });
    }

    viewPortRect () {
        this._viewPortRect.set(0, 0, this.state.width, this.state.height);
        return this._viewPortRect;
    }

    contentRect () {
        let rect = this.viewPortRect().copy();
        if (this.props.contentAspectRatio && this.props.contentAspectRatio > 0) {
            rect = fitCenterRect(this.props.contentAspectRatio, rect);
        }
        return rect;
    }

    transformedContentRect () {
        let rect = transformedRect(this.viewPortRect(), this.currentTransform());
        if (this.props.contentAspectRatio && this.props.contentAspectRatio > 0) {
            rect = fitCenterRect(this.props.contentAspectRatio, rect);
        }
        return rect;
    }

    currentTransform () {
        return new Transform(this.state.scale, this.state.translateX, this.state.translateY);
    }

    componentDidMount () {
        this.gestureResponder = createResponder({
            onStartShouldSetResponder: (evt, gestureState) => true,
            onMoveShouldSetResponderCapture: (evt, gestureState) => true,
            // onMoveShouldSetResponder: this.handleMove,
            onResponderMove: this.onResponderMove,
            onResponderGrant: this.onResponderGrant,
            onResponderRelease: this.onResponderRelease,
            onResponderTerminate: this.onResponderRelease,
            // Do not allow parent view to intercept gesture
            onResponderTerminationRequest: (evt, gestureState) => false,
            onResponderDoubleTapConfirmed: (evt, gestureState) => {
                this.props.onDoubleTapConfirmed &&
                    this.props.onDoubleTapConfirmed();
            },
            onResponderSingleTapConfirmed: (evt, gestureState) => {
                this.props.onSingleTapConfirmed &&
                    this.props.onSingleTapConfirmed();
            }
        });
    }

    componentDidUpdate (prevProps, prevState) {
        this.props.onViewTransformed &&
            this.props.onViewTransformed({
                scale: this.state.scale,
                translateX: this.state.translateX,
                translateY: this.state.translateY
            });
    }

    componentWillUnmount () {
        this.cancelAnimation();
    }

    render () {
        let gestureResponder = this.gestureResponder;
        if (!this.props.enableTransform) {
            gestureResponder = {};
        }

        return (
            <View
                style={{flex: 1}}
                {...this.props}
                {...gestureResponder}
                ref={(component) => (this.innerViewRef = component)}
                onLayout={this.onLayout}>
                <View
                    style={{
                        flex: 1,
                        transform: [
                            { scale: this.state.scale },
                            { translateX: this.state.translateX },
                            { translateY: this.state.translateY }
                        ]
                    }}
                >
                    { this.props.children }
                </View>
            </View>
        );
    }

    onLayout (e) {
        const {width, height} = e.nativeEvent.layout;
        if (width !== this.state.width || height !== this.state.height) {
            this.setState({width, height});
        }
        this.measureLayout();

        this.props.onLayout && this.props.onLayout(e);
    }

    measureLayout () {
        let handle = findNodeHandle(this.innerViewRef);
        NativeModules.UIManager.measure(handle, (x, y, width, height, pageX, pageY) => {
            if (typeof pageX === "number" && typeof pageY === "number") { // avoid undefined values on Android devices
                if (this.state.pageX !== pageX || this.state.pageY !== pageY) {
                    this.setState({ pageX: pageX, pageY: pageY });
                }
            }
        });
    }

    onResponderGrant (evt, gestureState) {
        this.props.onTransformStart && this.props.onTransformStart();
        this.setState({responderGranted: true});
        this.measureLayout();
    }

    onResponderMove (evt, gestureState) {
        this.cancelAnimation();

        let dx = gestureState.moveX - gestureState.previousMoveX;
        let dy = gestureState.moveY - gestureState.previousMoveY;
        if (this.props.enableResistance) {
            let d = this.applyResistance(dx, dy);
            dx = d.dx;
            dy = d.dy;
        }

        if (!this.props.enableTranslate) {
            dx = dy = 0;
        }

        let transform = {};
        if (gestureState.previousPinch && gestureState.pinch && this.props.enableScale) {
            let scaleBy = gestureState.pinch / gestureState.previousPinch;
            let pivotX = gestureState.moveX - this.state.pageX;
            let pivotY = gestureState.moveY - this.state.pageY;
            let rect = transformedRect(
                transformedRect(
                    this.contentRect(),
                    this.currentTransform()
                ),
                new Transform(scaleBy, dx, dy, { x: pivotX, y: pivotY })
            );
            transform = getTransform(this.contentRect(), rect);
            this.props.onPinchTransforming && this.props.onPinchTransforming(transform);
        } else {
            if (Math.abs(dx) > 2 * Math.abs(dy)) {
                dy = 0;
            } else if (Math.abs(dy) > 2 * Math.abs(dx)) {
                dx = 0;
            }
            transform.translateX = this.state.translateX + dx / this.state.scale;
            transform.translateY = this.state.translateY + dy / this.state.scale;
        }

        this.updateTransform(transform);

        const curScale = this.state.scale;
        if (curScale <= 1) {
            this.props.onPinchStartReached &&
                this.props.onPinchStartReached(transform);
        }
        if (curScale >= this.props.maxScale) {
            this.props.onPinchEndReached &&
                this.props.onPinchEndReached(transform);
        }

        return true;
    }

    onResponderRelease (evt, gestureState) {
        const transform = {
            scale: this.state.scale,
            translateX: this.state.translateX,
            translateY: this.state.translateY
        };

        if (gestureState.doubleTapUp) {
            if (!this.props.enableScale) {
                this.animateBounce();
                return;
            }
            let pivotX = 0;
            let pivotY = 0;
            if (gestureState.dx || gestureState.dy) {
                pivotX = gestureState.moveX - this.state.pageX;
                pivotY = gestureState.moveY - this.state.pageY;
            } else {
                pivotX = gestureState.x0 - this.state.pageX;
                pivotY = gestureState.y0 - this.state.pageY;
            }

            this.performDoubleTapUp(pivotX, pivotY);
        } else {
            if (this.props.enableTranslate) {
                this.performFling(gestureState.vx, gestureState.vy);
            } else {
                this.animateBounce();
            }
        }

        this.props.onTransformGestureReleased &&
            this.props.onTransformGestureReleased(transform);

        if (this.props.onSwipeUpReleased) {
            if (this.state.scale === 1 && this.state.translateY < -150) {
                this.props.onSwipeUpReleased(transform);
            }
        }
        if (this.props.onSwipeDownReleased) {
            if (this.state.scale === 1 && this.state.translateY > 150) {
                this.props.onSwipeDownReleased(transform);
            }
        }
    }

    performFling (vx, vy) {
        let startX = 0;
        let startY = 0;
        let maxX, minX, maxY, minY;
        let availablePanDistance = availableTranslateSpace(
            this.transformedContentRect(),
            this.viewPortRect()
        );
        if (vx > 0) {
            minX = 0;
            if (availablePanDistance.left > 0) {
                maxX = availablePanDistance.left +
                    this.props.maxOverScrollDistance;
            } else {
                maxX = 0;
            }
        } else {
            maxX = 0;
            if (availablePanDistance.right > 0) {
                minX = -availablePanDistance.right -
                    this.props.maxOverScrollDistance;
            } else {
                minX = 0;
            }
        }
        if (vy > 0) {
            minY = 0;
            if (availablePanDistance.top > 0) {
                maxY = availablePanDistance.top +
                    this.props.maxOverScrollDistance;
            } else {
                maxY = 0;
            }
        } else {
            maxY = 0;
            if (availablePanDistance.bottom > 0) {
                minY = -availablePanDistance.bottom -
                    this.props.maxOverScrollDistance;
            } else {
                minY = 0;
            }
        }

        vx *= 1000; // per second
        vy *= 1000;
        if (Math.abs(vx) > 2 * Math.abs(vy)) {
            vy = 0;
        } else if (Math.abs(vy) > 2 * Math.abs(vx)) {
            vx = 0;
        }

        this.scroller.fling(startX, startY, vx, vy, minX, maxX, minY, maxY);
    }

    performDoubleTapUp (pivotX, pivotY) {
        let curScale = this.state.scale;
        let scaleBy;
        if (curScale > (1 + this.props.maxScale) / 2) {
            scaleBy = 1 / curScale;
        } else {
            scaleBy = this.props.maxScale / curScale;
        }

        let rect = transformedRect(
            this.transformedContentRect(),
            new Transform(scaleBy, 0, 0, { x: pivotX, y: pivotY })
        );
        rect = transformedRect(
            rect,
            new Transform(
                1,
                this.viewPortRect().centerX() - pivotX,
                this.viewPortRect().centerY() - pivotY
            )
        );
        rect = alignedRect(rect, this.viewPortRect());
        this.animate(rect);

        if (
            this.props.onDoubleTapStartReached ||
            this.props.onDoubleTapEndReached
        ) {
            const transform = getTransform(this.contentRect(), rect);
            if (curScale > (1 + this.props.maxScale) / 2) {
                this.props.onDoubleTapStartReached &&
                    this.props.onDoubleTapStartReached(transform);
            } else {
                this.props.onDoubleTapEndReached &&
                    this.props.onDoubleTapEndReached(transform);
            }
        }
    }

    applyResistance (dx, dy) {
        let availablePanDistance = availableTranslateSpace(
            this.transformedContentRect(),
            this.viewPortRect()
        );

        if ((dx > 0 && availablePanDistance.left < 0) ||
        (dx < 0 && availablePanDistance.right < 0)) {
            const { resistantStrHorizontal } = this.props;
            switch (typeof resistantStrHorizontal) {
                case "function":
                    const returnValue = resistantStrHorizontal(dx);
                    if (typeof returnValue === "number") {
                        dx = returnValue;
                        break;
                    }
                    if (typeof returnValue === "string") {
                        dx = parseFloat(returnValue);
                        break;
                    }
                    // eslint-disable-next-line no-console
                    console.warn(
                        "react-native-gallery-swiper",
                        "Invalid return value for 'resistantStrHorizontal' prop. " +
                        "Expecting one of 'number' or 'string'."
                    );
                    dx = dx /= 3;
                    break;
                case "number":
                    dx = resistantStrHorizontal;
                    break;
                case "string":
                    dx = parseFloat(resistantStrHorizontal);
                    break;
                default:
                    dx = dx /= 3;
                    break;
            }
        }
        if ((dy > 0 && availablePanDistance.top < 0) ||
        (dy < 0 && availablePanDistance.bottom < 0)) {
            const { resistantStrVertical } = this.props;
            switch (typeof resistantStrVertical) {
                case "function":
                    const returnValue = resistantStrVertical(dy);
                    if (typeof returnValue === "number") {
                        dy = returnValue;
                        break;
                    }
                    if (typeof returnValue === "string") {
                        dy = parseFloat(returnValue);
                        break;
                    }
                    // eslint-disable-next-line no-console
                    console.warn(
                        "react-native-gallery-swiper",
                        "Invalid return value for 'resistantStrVertical' prop. " +
                        "Expecting one of 'number' or 'string'."
                    );
                    dy = dy /= 3;
                    break;
                case "number":
                    dy = resistantStrVertical;
                    break;
                case "string":
                    dy = parseFloat(resistantStrVertical);
                    break;
                default:
                    dy = dy /= 3;
                    break;
            }
        }

        return { dx, dy };
    }

    cancelAnimation () {
        this.state.animator.stopAnimation();
    }

    animate (targetRect, durationInMillis) {
        let duration = 200;
        if (durationInMillis) {
            duration = durationInMillis;
        }

        let fromRect = this.transformedContentRect();
        if (fromRect.equals(targetRect, 0.01)) {
            return;
        }

        this.state.animator.removeAllListeners();
        this.state.animator.setValue(0);
        this.state.animator.addListener((state) => {
            let progress = state.value;

            let left = fromRect.left +
                (targetRect.left - fromRect.left) * progress;
            let right = fromRect.right +
                (targetRect.right - fromRect.right) * progress;
            let top = fromRect.top +
                (targetRect.top - fromRect.top) * progress;
            let bottom = fromRect.bottom +
                (targetRect.bottom - fromRect.bottom) * progress;

            let transform = getTransform(
                this.contentRect(),
                new Rect(left, top, right, bottom)
            );
            this.updateTransform(transform);
        });

        Animated.timing(
            this.state.animator,
            {
                toValue: 1,
                duration: duration,
                easing: Easing.inOut(Easing.ease)
            }
        ).start();
    }

    animateBounce () {
        let curScale = this.state.scale;
        let minScale = 1;
        let maxScale = this.props.maxScale;
        let scaleBy = 1;
        if (curScale > maxScale) {
            scaleBy = maxScale / curScale;
        } else if (curScale < minScale) {
            scaleBy = minScale / curScale;
        }

        let rect = transformedRect(
            this.transformedContentRect(),
            new Transform(
                scaleBy,
                0,
                0,
                {
                    x: this.viewPortRect().centerX(),
                    y: this.viewPortRect().centerY()
                }
            )
        );
        rect = alignedRect(rect, this.viewPortRect());
        this.animate(rect);
    }

    updateTransform (transform) {
        this.setState(transform);
    }

    forceUpdateTransform (transform) {
        this.setState(transform);
    }

    getAvailableTranslateSpace () {
        return availableTranslateSpace(
            this.transformedContentRect(),
            this.viewPortRect()
        );
    }
}
