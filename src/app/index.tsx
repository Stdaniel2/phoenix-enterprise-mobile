import { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../lib/supabase";
import GoogleSignInButton from "../components/GoogleSignInButton";
const products = [
  {
    id: 1,
    name: '6" Solid Block',
    description: "Strong and durable blocks for walls and foundations.",
    price: 750,
  },
  {
    id: 2,
    name: '6" Hollow Block',
    description: "Lightweight hollow blocks for quality construction.",
    price: 650,
  },
  {
    id: 3,
    name: '5" Solid Block',
    description: "Reliable blocks for residential and commercial projects.",
    price: 650,
  },
  {
    id: 4,
    name: '9" Hollow Block',
    description: "Heavy-duty hollow blocks for larger projects.",
    price: 750,
  },
];

type CartItem = {
  id: number;
  name: string;
  price: number;
  quantity: number;
};

const naira = (amount: number) =>
  `₦${amount.toLocaleString("en-NG")}`;

export default function HomeScreen() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartLoaded, setCartLoaded] = useState(false);
const [checkoutVisible, setCheckoutVisible] = useState(false);
const [customerName, setCustomerName] = useState("");
const [phone, setPhone] = useState("");
const [address, setAddress] = useState("");
const [notes, setNotes] = useState("");
const [submitting, setSubmitting] = useState(false);
useEffect(() => {
  let mounted = true;

  async function loadCart() {
    const {
  data: { session },
  error: sessionError,
} = await supabase.auth.getSession();

if (sessionError) {
  if (mounted) {
    Alert.alert("Authentication error", sessionError.message);
  }
  return;
}

const user = session?.user ?? null;
    console.log("MOBILE USER ID:", user?.id);
    

    if (!user) {
      if (mounted) setCartLoaded(true);
      return;
    }

    const { data, error } = await supabase
      .from("user_carts")
      .select("items")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      if (mounted) Alert.alert("Cart could not load", error.message);
      return;
    }

    if (mounted) {
      setCart(Array.isArray(data?.items) ? (data.items as CartItem[]) : []);
      setCartLoaded(true);
    }
  }

  void loadCart();

  return () => {
    mounted = false;
  };
}, []);
useEffect(() => {
  if (!cartLoaded) return;

  let cancelled = false;

  async function saveCart() {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (cancelled || userError || !user) return;

    const { error } = await supabase.from("user_carts").upsert({
      user_id: user.id,
      items: cart,
      updated_at: new Date().toISOString(),
    });

    if (error && !cancelled) {
      Alert.alert("Cart could not sync", error.message);
    }
  }

  void saveCart();

  return () => {
    cancelled = true;
  };
}, [cart, cartLoaded]);
  function addToCart(product: (typeof products)[number]) {
    setCart((currentCart) => {
      const existingItem = currentCart.find((item) => item.id === product.id);

      if (existingItem) {
        return currentCart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [
        ...currentCart,
        {
          id: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
        },
      ];
    });
  }

  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const total = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
async function handleCheckout() {
  if (!customerName.trim() || !phone.trim() || !address.trim()) {
    Alert.alert("Missing details", "Please enter your name, phone, and delivery address.");
    return;
  }

  setSubmitting(true);

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;
    if (!user?.email) throw new Error("Please sign in before placing your order.");

    const { error: orderError } = await supabase.from("orders").insert({
      customer_name: customerName.trim(),
      phone: phone.trim(),
      address: address.trim(),
      notes: notes.trim(),
      items: cart,
      total,
    });

    if (orderError) throw orderError;

    let emailSent = false;
    try {
      const response = await fetch(
        "https://phoenix-enterprise-beige.vercel.app/api/send-confirmation",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: user.email,
            customerName: customerName.trim(),
            total,
          }),
        },
      );
      emailSent = response.ok;
    } catch {
      // The order is already saved, even if email delivery fails.
    }

    setCart([]);
    setCheckoutVisible(false);
    setCustomerName("");
    setPhone("");
    setAddress("");
    setNotes("");

    Alert.alert(
      "Order received",
      emailSent
        ? "Your order was placed and a confirmation email was sent."
        : "Your order was placed, but the confirmation email could not be sent.",
    );
  } catch (error) {
    Alert.alert(
      "Could not place order",
      error instanceof Error ? error.message : "Please try again.",
    );
  } finally {
    setSubmitting(false);
  }
}
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.brand}>Phoenix Enterprise</Text>
        <Text style={styles.subtitle}>Quality Concrete Blocks</Text>
        <GoogleSignInButton />
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Build with confidence.</Text>
          <Text style={styles.heroText}>
            Durable concrete blocks for your next project.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Our Products</Text>

        {products.map((product) => (
          <View key={product.id} style={styles.card}>
            <Text style={styles.productIcon}>🧱</Text>
            <Text style={styles.productName}>{product.name}</Text>
            <Text style={styles.description}>{product.description}</Text>

            <View style={styles.cardFooter}>
              <Text style={styles.price}>{naira(product.price)}</Text>
              <Pressable
                style={styles.button}
                onPress={() => addToCart(product)}
              >
                <Text style={styles.buttonText}>Add to Cart</Text>
              </Pressable>
            </View>
          </View>
        ))}

        <View style={styles.cart}>
          <Text style={styles.sectionTitle}>Your Cart ({itemCount})</Text>

          {cart.length === 0 ? (
            <Text style={styles.emptyCart}>Your cart is empty.</Text>
          ) : (
            <>
              {cart.map((item) => (
                <View key={item.id} style={styles.cartRow}>
                  <Text style={styles.cartItem}>
                    {item.name} × {item.quantity}
                  </Text>
                  <Text style={styles.cartItem}>
                    {naira(item.price * item.quantity)}
                  </Text>
                </View>
              ))}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalLabel}>{naira(total)}</Text>
              </View>
              <Pressable
  style={styles.button}
  onPress={() => setCheckoutVisible(true)}
>
  <Text style={styles.buttonText}>Proceed to Checkout</Text>
</Pressable>
            </>
          )}
        </View>
      </ScrollView>
      <Modal
  visible={checkoutVisible}
  animationType="slide"
  transparent
  onRequestClose={() => setCheckoutVisible(false)}
>
  <View
    style={{
      flex: 1,
      justifyContent: "center",
      backgroundColor: "rgba(0,0,0,0.5)",
      padding: 20,
    }}
  >
    <View style={{ backgroundColor: "white", borderRadius: 16, padding: 20 }}>
      <Text style={{ fontSize: 22, fontWeight: "700", marginBottom: 16 }}>
        Checkout
      </Text>

      <TextInput
        placeholder="Full name"
        value={customerName}
        onChangeText={setCustomerName}
        style={{ borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12, marginBottom: 10 }}
      />
      <TextInput
        placeholder="Phone number"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        style={{ borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12, marginBottom: 10 }}
      />
      <TextInput
        placeholder="Delivery address"
        value={address}
        onChangeText={setAddress}
        multiline
        style={{ borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12, marginBottom: 10 }}
      />
      <TextInput
        placeholder="Notes (optional)"
        value={notes}
        onChangeText={setNotes}
        multiline
        style={{ borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12, marginBottom: 10 }}
      />

      <Text style={{ marginBottom: 14 }}>Total: {naira(total)}</Text>

      <Pressable
        onPress={handleCheckout}
        disabled={submitting}
        style={{ backgroundColor: "#111827", borderRadius: 8, padding: 14, alignItems: "center" }}
      >
        <Text style={{ color: "white", fontWeight: "700" }}>
          {submitting ? "Placing order…" : "Place order"}
        </Text>
      </Pressable>

      <Pressable
        onPress={() => setCheckoutVisible(false)}
        style={{ padding: 14, alignItems: "center" }}
      >
        <Text>Cancel</Text>
      </Pressable>
    </View>
  </View>
</Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  brand: {
    color: "#111827",
    fontSize: 24,
    fontWeight: "700",
  },
  subtitle: {
    color: "#6b7280",
    fontSize: 14,
    marginTop: 4,
  },
  hero: {
    backgroundColor: "#111827",
    borderRadius: 16,
    padding: 22,
    marginTop: 24,
    marginBottom: 28,
  },
  heroTitle: {
    color: "#ffffff",
    fontSize: 26,
    fontWeight: "700",
  },
  heroText: {
    color: "#d1d5db",
    fontSize: 16,
    lineHeight: 23,
    marginTop: 8,
  },
  sectionTitle: {
    color: "#111827",
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 14,
  },
  card: {
    backgroundColor: "#ffffff",
    borderColor: "#e5e7eb",
    borderRadius: 14,
    borderWidth: 1,
    padding: 18,
    marginBottom: 14,
  },
  productIcon: {
    fontSize: 34,
    marginBottom: 10,
  },
  productName: {
    color: "#111827",
    fontSize: 19,
    fontWeight: "700",
  },
  description: {
    color: "#6b7280",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 7,
  },
  cardFooter: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 18,
  },
  price: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "700",
  },
  button: {
    backgroundColor: "#111827",
    borderRadius: 9,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  cart: {
    backgroundColor: "#ffffff",
    borderColor: "#e5e7eb",
    borderRadius: 14,
    borderWidth: 1,
    padding: 18,
    marginTop: 14,
  },
  emptyCart: {
    color: "#6b7280",
    fontSize: 15,
  },
  cartRow: {
    borderBottomColor: "#e5e7eb",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  cartItem: {
    color: "#374151",
    fontSize: 14,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 16,
  },
  totalLabel: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "700",
  },
});