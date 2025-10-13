import {
  Text,
  View
} from "react-native";

const options = [
  {
    systemImage: "info.circle",
    title: "Show List Info",
    type: "button",
  },
  {
    title: "Select Reminders",
    systemImage: "checkmark.circle",
    type: "button",
  },
  {
    title: "Sort By",
    systemImage: "arrow.up.arrow.down",
    type: "submenu",
    items: [
      {
        title: "Manual",
        systemImage: "hand.point.up.left",
        type: "button",
      },
      {
        title: "Due Date",
        systemImage: "calendar",
        type: "button",
      },
      {
        title: "Creation Date",
        systemImage: "plus.circle",
        type: "button",
      },
      {
        title: "Priority",
        systemImage: "exclamationmark.triangle",
        type: "button",
      },
      {
        title: "Title",
        systemImage: "textformat.abc",
        type: "button",
      },
    ],
  },
  {
    title: "Show Completed",
    systemImage: "eye",
    type: "switch",
    value: true,
  },
  {
    title: "Settings",
    systemImage: "gear",
    type: "submenu",
    items: [
      {
        title: "Notifications",
        systemImage: "bell",
        type: "button",
      },
      {
        title: "Advanced",
        systemImage: "wrench.and.screwdriver",
        type: "submenu",
        items: [
          {
            title: "Debug Mode",
            systemImage: "ladybug",
            type: "button",
          },
          {
            title: "Reset Settings",
            systemImage: "arrow.clockwise",
            type: "button",
            destructive: true,
          },
        ],
      },
    ],
  },
  {
    title: "Print",
    systemImage: "printer",
    type: "button",
  },
  {
    title: "Delete List",
    systemImage: "trash",
    type: "button",
    destructive: true,
  },
];

export default function ContextMenuProfile() {
  return (
    <View style={{ width: 150, height: 50 }}>
      <Text>Context Menu Placeholder</Text>
    </View>
  );
}
