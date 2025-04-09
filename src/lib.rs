#![no_std] // Indica que no usamos la biblioteca estándar de Rust
use soroban_sdk::{contract, contractimpl, Env, String, Vec, Map, symbol_short};

// Definimos la clave de almacenamiento como una constante para evitar errores tipográficos
const PRODUCTS_KEY: soroban_sdk::Symbol = symbol_short!("PRODUCTS");

#[contract]
pub struct InventoryContract;

#[contractimpl]
impl InventoryContract {

    // --- CREATE (Crear) ---
    /// Añade un nuevo producto al inventario.
    /// Panics si el producto con el mismo nombre ya existe.
    ///
    /// # Arguments
    ///
    /// * `name` - El nombre del producto (String).
    /// * `quantity` - La cantidad inicial del producto (i32).
    /// * `price` - El precio del producto (i32).
    pub fn add_product(env: Env, name: String, quantity: i32, price: i32) {
        // Obtenemos el mapa de productos del almacenamiento persistente.
        // Si no existe, crea un mapa vacío.
        let mut products: Map<String, Vec<i32>> = env
            .storage()
            .persistent()
            .get(&PRODUCTS_KEY)
            .unwrap_or(Map::new(&env)); // Crea un mapa vacío si no hay nada

        // Verificamos si el producto ya existe para evitar duplicados
        if products.contains_key(name.clone()) {
            panic!("Producto ya existe"); // Error si el producto ya está registrado
        }

        // Creamos el vector con [cantidad, precio]
        let product_data = Vec::from_array(&env, [quantity, price]);
        // Añadimos/actualizamos el producto en el mapa
        products.set(name, product_data);
        // Guardamos el mapa actualizado en el almacenamiento persistente
        env.storage().persistent().set(&PRODUCTS_KEY, &products);
    }

    // --- READ (Leer) ---
    /// Obtiene los datos (cantidad y precio) de un producto por su nombre.
    /// Devuelve un vector vacío si el producto no se encuentra.
    ///
    /// # Arguments
    ///
    /// * `name` - El nombre del producto a buscar (String).
    ///
    /// # Returns
    ///
    /// * `Vec<i32>` - Un vector que contiene [cantidad, precio] o un vector vacío si no se encuentra.
    pub fn get_product(env: Env, name: String) -> Vec<i32> {
        // Obtenemos el mapa de productos
        let products: Map<String, Vec<i32>> = env
            .storage()
            .persistent()
            .get(&PRODUCTS_KEY)
            .unwrap_or(Map::new(&env)); // Si el mapa no existe, devuelve uno vacío

        // Intentamos obtener el producto por nombre.
        // Si no existe (unwrap_or_else), devolvemos un vector vacío.
        products.get(name).unwrap_or_else(|| Vec::new(&env))
    }

    // --- UPDATE (Actualizar) ---
    /// Actualiza la cantidad y el precio de un producto existente.
    /// Panics si el producto con ese nombre no existe.
    ///
    /// # Arguments
    ///
    /// * `name` - El nombre del producto a actualizar (String).
    /// * `new_quantity` - La nueva cantidad del producto (i32).
    /// * `new_price` - El nuevo precio del producto (i32).
    pub fn update_product(env: Env, name: String, new_quantity: i32, new_price: i32) {
        // Obtenemos el mapa de productos
        let mut products: Map<String, Vec<i32>> = env
            .storage()
            .persistent()
            .get(&PRODUCTS_KEY)
             // Si el mapa PRODUCTS no existe, no hay nada que actualizar, panic.
            .expect("Mapa de productos NO inicializado. Añade productos primero.");

        // Verificamos que el producto EXISTA antes de intentar actualizarlo
        if !products.contains_key(name.clone()) {
            panic!("Producto no encontrado para actualizar"); // Error si no existe
        }

        // Creamos el nuevo vector de datos [cantidad, precio]
        let updated_data = Vec::from_array(&env, [new_quantity, new_price]);
        // Actualizamos el producto en el mapa (set sobrescribe el valor existente)
        products.set(name, updated_data);
        // Guardamos el mapa actualizado
        env.storage().persistent().set(&PRODUCTS_KEY, &products);
    }

    // --- DELETE (Borrar) ---
    /// Elimina un producto del inventario por su nombre.
    /// No hace nada si el producto no existe.
    ///
    /// # Arguments
    ///
    /// * `name` - El nombre del producto a eliminar (String).
    pub fn delete_product(env: Env, name: String) {
        // Obtenemos el mapa de productos
        let mut products: Map<String, Vec<i32>> = env
            .storage()
            .persistent()
            .get(&PRODUCTS_KEY)
            .unwrap_or(Map::new(&env)); // Si no hay mapa, no hay nada que borrar

        // Intentamos eliminar el producto. `remove` no falla si la clave no existe.
        products.remove(name);

        // Guardamos el mapa (posiblemente modificado) de vuelta al almacenamiento
        env.storage().persistent().set(&PRODUCTS_KEY, &products);
    }
}