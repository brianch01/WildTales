import { Text, View, TouchableOpacity } from "react-native";
import { useState } from "react";
import { ArrowLeftIcon, Icon } from  "@/components/ui/icon";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

export default function SetPin() {
  const [pin, setPin] = useState<string>("");
  const router = useRouter();

  const handlePress = (num: string) => {
    if (pin.length < 4) {
      setPin(pin + num);
    }
  };

  const renderPinCircles = () => {
    return [0, 1, 2, 3].map((i) => {
      const filled = i < pin.length;
      return (
        <View
          key={i}
          style={{
            width: 60,
            height: 60,
            borderRadius: 30,
            marginHorizontal: 15,
            backgroundColor: filled ? "#C75FFF" : "#E0DEE1",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {filled && <Text style={{ fontSize: 38, color: "#fff" }}>*</Text>}
        </View>
      );
    });
  };

  const renderKeypad = () => {
    const keys = [["1", "2", "3"], ["4", "5", "6"], ["7", "8", "9"]];
    return (
      <>
        {keys.map((row, rowIndex) => (
          <View key={rowIndex} style={{ flexDirection: "row", width: "100%" }}>
            {row.map((num, idx) => (
              <TouchableOpacity
                key={num}
                onPress={() => handlePress(num)}
                style={{
                  width: "33%",
                  alignItems: "center",
                  paddingVertical: 16,
                }}
              >
                <Text style={{ fontSize: 28, backgroundColor: "#E9D5FF", padding:15, paddingLeft:24,paddingRight:24, borderRadius: 100 }}>{num}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
        <View style={{ flexDirection: "row", width: "100%" }}>
          <View style={{ width: "33%" }} />
          <TouchableOpacity
            onPress={() => handlePress("0")}
            style={{
              width: "33%",
              alignItems: "center",
              paddingVertical: 16,
            }}
          >
            <Text style={{ fontSize: 28, backgroundColor: "#E9D5FF", padding:15, paddingLeft:24,paddingRight:24, borderRadius: 100 }}>0</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setPin(pin.slice(0, -1))}
            style={{
              width: "33%",
              alignItems: "center",
              paddingVertical: 25,
            }}
          >
            <Ionicons size = {40} name="backspace"></Ionicons>
          </TouchableOpacity>
        </View>
      </>
    );
  };

  return (
    <View style={{ flex: 1, padding: 30, justifyContent: "center", backgroundColor: "#fff" }}>
      <Text style={{ fontSize: 26, fontWeight: "bold", marginBottom: 20 }}>
        Enter the{"\n"}Parent PIN
      </Text>

      <View style={{ flexDirection: "row", justifyContent: "center", marginBottom: 50 }}>
        {renderPinCircles()}
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {renderKeypad()}
      </View>
      
      <View style={{ alignItems: "center", marginTop: 30 }}>
        <TouchableOpacity
          onPress={() => {
            if (pin.length === 4) {
                router.push({
                    pathname: "/pin/confirm",
                    params: { pin },
                  });
            }
          }}
          disabled={pin.length !== 4}
          style={{
            width: "70%",
            backgroundColor: pin.length === 4 ? "#C75FFF" : "#D1D5DB",
            paddingVertical: 14,
            borderRadius: 12,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#fff", fontSize: 18, fontWeight: "600" }}>
            Confirm
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}