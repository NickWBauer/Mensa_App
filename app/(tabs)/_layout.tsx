import { Ionicons } from "@expo/vector-icons";
import { Tabs } from 'expo-router';
import React from 'react';

const TabsLayout = () => {
  return (
    <Tabs
    screenOptions={{
        tabBarActiveTintColor: "white",
        tabBarInactiveTintColor: "grey",
        tabBarStyle:{
            backgroundColor: "#1e293b",
            borderTopWidth: 1,
            borderTopColor: "yellow",
                height: 90,
            paddingBottom: 30,
            paddingTop: 10,
        },
        tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: "600",
        },
        headerShown: false,
    }}
    >
        <Tabs.Screen 
            name="index"
            options = {{
                title:"Todos",
                tabBarIcon: ({color, size}) => 
                    <Ionicons name ='flash-outline' size={size} color={color}/>
            }}
        />
        <Tabs.Screen 
            name="settings"
            options = {{
                title:"Settings",
                tabBarIcon: ({color, size}) => 
                    <Ionicons name ='settings' size={size} color={color}/>
            }}
        />
        <Tabs.Screen 
            name="impressum"
            options = {{
                title:"Impressum",
                tabBarIcon: ({color, size}) => 
                    <Ionicons name ='information-circle' size={size} color={color}/>
            }}
        />
        <Tabs.Screen 
            name="mittagsmenu"
            options = {{
                title:"Mittagsgerichte",
                tabBarIcon: ({color, size}) => 
                    <Ionicons name ='pizza' size={size} color={color}/>
            }}
        />
    </Tabs>
  );
};

export default TabsLayout