import { StyleSheet, Text, View, Pressable } from "react-native";
import { useRouter } from "expo-router";


export default function Index() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Pressable
        style={styles.impressumButton}
        onPress={() => router.push("/(tabs)/impressum")}
      >
        <Text style={styles.impressumButtonText}>Impressum</Text>
      </Pressable>
      <Text style = {styles.content} >Edit app/index.tsx to edit this screen.</Text>
      <Text>hihoha</Text>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },

  content: {
    fontSize: 15,

  },

  impressumButton: {
    position: "absolute",
    top: 20,
    right: 20,
    backgroundColor: "#3b82f6",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 5,
  },

  impressumButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
})
