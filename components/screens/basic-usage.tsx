import {
  background,
  cornerRadius,
  fixedSize,
  frame,
  padding,
} from "@expo/ui/build/swift-ui/modifiers";
import {
  CircularProgress,
  Text as ExpoUIText,
  Host,
  HStack,
  LinearProgress,
  Slider,
  VStack,
} from "@expo/ui/swift-ui";
import { Link } from "expo-router";
import { useState } from "react";
import { ScrollView, Text } from "react-native";

const fromSadToHappy = [
  "😭",
  "😢",
  "☹️",
  "😕",
  "😐",
  "🙂",
  "😊",
  "😃",
  "😄",
  "😁",
  "😆",
  "😅",
  "😂",
  "🤣",
  "🥳",
];

const fromSadToHappyStrings = [
  "Devastated",
  "Very sad",
  "Sad",
  "A bit sad",
  "Neutral",
  "Slightly happy",
  "Happy",
  "Cheerful",
  "Very happy",
  "Joyful",
  "Excited",
  "Laughing",
  "Hilarious",
  "Rolling with laughter",
  "Celebrating",
];

export default function BasicUsage() {
  const [mood, setMood] = useState("happy");
  const [emoji, setEmoji] = useState("😊");

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: 16 }}
    >
      <Link href="/basic/modifiers" style={{ marginBottom: 0 }}>
        Go to Modifiers
      </Link>
      <Host matchContents>
        <CircularProgress
          color={"orange"}
          modifiers={[fixedSize(true), padding({ vertical: 16 })]}
        />
      </Host>
      <Text>Loading...</Text>

      <Host matchContents style={{ marginTop: 16 }}>
        <VStack
          spacing={32}
          modifiers={[
            // border({ color: "#ff0000", width: 1 }),
            background("#fff"),
            cornerRadius(16),
            // glassEffect({
            //   glass: {
            //     variant: "regular",
            //     interactive: false,
            //   },
            //   shape: "rectangle",
            // }),
          ]}
        >
          <HStack
            spacing={32}
            modifiers={[padding({ all: 16 }), frame({ height: 100 })]}
          >
            <VStack spacing={12}>
              <ExpoUIText modifiers={[]} size={48}>
                {emoji}
              </ExpoUIText>
              {/* <ExpoUIText>{mood}</ExpoUIText> */}
            </VStack>

            <VStack spacing={12}>
              <ExpoUIText size={24}>{mood}</ExpoUIText>
              <Slider
                steps={fromSadToHappyStrings.length}
                max={fromSadToHappyStrings.length - 1}
                value={fromSadToHappyStrings.indexOf(mood)}
                onValueChange={(event: number) => {
                  const roundedValue = Math.round(event);
                  setEmoji(fromSadToHappy[roundedValue]);
                  setMood(fromSadToHappyStrings[roundedValue]);
                }}
              />
            </VStack>
          </HStack>

          <LinearProgress
            progress={
              (fromSadToHappyStrings.indexOf(mood) + 1) /
              (fromSadToHappyStrings.length - 1)
            }
            color={
              fromSadToHappyStrings.indexOf(mood) < 4
                ? "red"
                : fromSadToHappyStrings.indexOf(mood) < 8
                ? "orange"
                : "green"
            }
          />
        </VStack>
      </Host>
    </ScrollView>
  );
}
