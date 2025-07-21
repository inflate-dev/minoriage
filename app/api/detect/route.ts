import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;
    
    if (!imageFile) {
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 }
      );
    }

    // Get user from session
    //const sessionHeader = request.headers.get('Authorization');
    //if (!sessionHeader) {
    //  return NextResponse.json(
    //    { error: 'Unauthorized' },
    //    { status: 401 }
    //  );
    //}

    // In a real implementation, you would:
    // 1. Upload the image to Supabase Storage
    // 2. Send the image to your object detection service (e.g., YOLOv8, TensorFlow, etc.)
    // 3. Process the detection results
    // 4. Save the results to the database

    // Mock detection results for demonstration
    const mockDetections = [
      {
        type: 'クロワッサン',
        confidence: 0.95,
        bbox: { x: 100, y: 150, width: 80, height: 60 },
        quantity: 1
      },
      {
        type: 'クロワッサン',
        confidence: 0.92,
        bbox: { x: 200, y: 170, width: 75, height: 55 },
        quantity: 1
      },
      {
        type: 'メロンパン',
        confidence: 0.88,
        bbox: { x: 300, y: 140, width: 90, height: 70 },
        quantity: 1
      }
    ];

    const totalCount = mockDetections.reduce((sum, det) => sum + det.quantity, 0);

    // Save to database (mock implementation)
    // const { data, error } = await supabase
    //   .from('detection_results')
    //   .insert({
    //     user_id: 'user-id',
    //     image_url: 'uploaded-image-url',
    //     detections: mockDetections,
    //     total_count: totalCount
    //   });

    return NextResponse.json({
      success: true,
      detections: mockDetections,
      totalCount,
      message: `${totalCount}個のパンを検出しました`
    });

  } catch (error) {
    console.error('Detection API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}